import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

logger = logging.getLogger(__name__)

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "rl_research_db")
PAPER_TTL_DAYS = int(os.getenv("PAPER_TTL_DAYS", 365))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
papers_collection = db.papers
agent_status_collection = db.agent_status
bookmarks_collection = db.bookmarks


# --- #13 + #15: Indexes & TTL ---

async def ensure_indexes():
    """Create all required indexes. Idempotent — safe to call on every startup."""
    # Fast deduplication lookups
    await papers_collection.create_index("arxiv_id", unique=True)
    # Feed-type filtering
    await papers_collection.create_index("feed_type")
    # TTL: auto-expire papers after PAPER_TTL_DAYS (only applies to docs with created_at)
    if PAPER_TTL_DAYS > 0:
        await papers_collection.create_index(
            "created_at", expireAfterSeconds=PAPER_TTL_DAYS * 86400
        )
    # Bookmark deduplication
    await bookmarks_collection.create_index("arxiv_id", unique=True)
    logger.info("MongoDB indexes ensured.")


# --- Core paper operations ---

async def check_if_exists(arxiv_id: str) -> bool:
    count = await papers_collection.count_documents({"arxiv_id": arxiv_id})
    return count > 0


async def insert_analyzed_paper(data: dict):
    # Stamp created_at so the TTL index can expire old papers (#15)
    data.setdefault("created_at", datetime.utcnow())
    result = await papers_collection.insert_one(data)
    return result.inserted_id


# --- #14: Paginated + searchable paper fetching ---

async def get_papers(
    feed_type: str,
    limit: int = 20,
    offset: int = 0,
    search: str = "",
    category: str = "",
) -> list:
    conditions = []

    if feed_type == "general":
        conditions.append({"$or": [{"feed_type": "general"}, {"feed_type": {"$exists": False}}]})
    else:
        conditions.append({"feed_type": feed_type})

    if search:
        conditions.append({"$or": [
            {"title": {"$regex": search, "$options": "i"}},
            {"key_innovation": {"$regex": search, "$options": "i"}},
            {"problem_addressed": {"$regex": search, "$options": "i"}},
        ]})

    if category:
        conditions.append({"rl_category": {"$regex": category, "$options": "i"}})

    query = {"$and": conditions} if len(conditions) > 1 else conditions[0]
    cursor = papers_collection.find(query, {"_id": 0}).sort("published_date", -1).skip(offset).limit(limit)
    return await cursor.to_list(length=limit)


# --- #4: DB-backed agent status (survives server restarts) ---

async def get_agent_status(feed_type: str) -> bool:
    doc = await agent_status_collection.find_one({"feed_type": feed_type})
    return doc.get("is_running", False) if doc else False


async def set_agent_status(feed_type: str, is_running: bool):
    await agent_status_collection.update_one(
        {"feed_type": feed_type},
        {"$set": {"is_running": is_running, "updated_at": datetime.utcnow()}},
        upsert=True,
    )


# --- #19: Bookmarks ---

async def toggle_bookmark(arxiv_id: str) -> dict:
    """Toggle bookmark; returns new state."""
    existing = await bookmarks_collection.find_one({"arxiv_id": arxiv_id})
    if existing:
        await bookmarks_collection.delete_one({"arxiv_id": arxiv_id})
        return {"bookmarked": False}
    await bookmarks_collection.insert_one({"arxiv_id": arxiv_id, "created_at": datetime.utcnow()})
    return {"bookmarked": True}


async def get_bookmark_ids() -> list:
    return [b["arxiv_id"] async for b in bookmarks_collection.find({}, {"arxiv_id": 1, "_id": 0})]


async def get_bookmarked_papers() -> list:
    ids = await get_bookmark_ids()
    if not ids:
        return []
    cursor = papers_collection.find({"arxiv_id": {"$in": ids}}, {"_id": 0}).sort("published_date", -1)
    return await cursor.to_list(length=1000)
