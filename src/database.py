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

# New collections for added features
trend_summaries_collection = db.trend_summaries
notes_collection = db.notes
schedule_state_collection = db.schedule_state
settings_collection = db.settings
custom_feeds_collection = db.custom_feeds
author_reputation_cache = db.author_reputation_cache


# --- Indexes & TTL ---

async def ensure_indexes():
    """Create all required indexes. Idempotent — safe to call on every startup."""
    # Fast deduplication lookups
    await papers_collection.create_index("arxiv_id", unique=True)
    # Feed-type filtering
    await papers_collection.create_index("feed_type")
    # RL category filtering (Feature 6)
    await papers_collection.create_index("rl_category")
    # Reading status (Feature 8)
    await papers_collection.create_index("reading_status")
    # Published date sorting
    await papers_collection.create_index("published_date")
    # TTL: auto-expire papers after PAPER_TTL_DAYS (only applies to docs with created_at)
    if PAPER_TTL_DAYS > 0:
        await papers_collection.create_index(
            "created_at", expireAfterSeconds=PAPER_TTL_DAYS * 86400
        )
    # Bookmark deduplication
    await bookmarks_collection.create_index("arxiv_id", unique=True)

    # Feature 5: Trend summaries
    await trend_summaries_collection.create_index("feed_type")
    await trend_summaries_collection.create_index("created_at")

    # Feature 17: Notes
    await notes_collection.create_index("arxiv_id", unique=True)
    await notes_collection.create_index("updated_at")

    # Feature 7: Author reputation cache
    await author_reputation_cache.create_index("author_name", unique=True)
    await author_reputation_cache.create_index("cached_at")

    # Feature 13: Custom feeds
    await custom_feeds_collection.create_index("name")

    # Feature 14: Schedule state
    await schedule_state_collection.create_index("job_name", unique=True)

    logger.info("MongoDB indexes ensured.")


# --- Core paper operations ---

async def check_if_exists(arxiv_id: str) -> bool:
    count = await papers_collection.count_documents({"arxiv_id": arxiv_id})
    return count > 0


async def insert_analyzed_paper(data: dict):
    # Stamp created_at so the TTL index can expire old papers
    data.setdefault("created_at", datetime.utcnow())
    data.setdefault("reading_status", "new")  # Feature 8: default status
    result = await papers_collection.insert_one(data)
    return result.inserted_id


# --- Paginated + searchable paper fetching ---

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
    cursor = papers_collection.find(query, {"_id": 0, "embedding": 0}).sort("published_date", -1).skip(offset).limit(limit)
    return await cursor.to_list(length=limit)


# --- DB-backed agent status (survives server restarts) ---

async def get_agent_status(feed_type: str) -> bool:
    doc = await agent_status_collection.find_one({"feed_type": feed_type})
    return doc.get("is_running", False) if doc else False


async def set_agent_status(feed_type: str, is_running: bool):
    await agent_status_collection.update_one(
        {"feed_type": feed_type},
        {"$set": {"is_running": is_running, "updated_at": datetime.utcnow()}},
        upsert=True,
    )


# --- Bookmarks ---

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
    cursor = papers_collection.find({"arxiv_id": {"$in": ids}}, {"_id": 0, "embedding": 0}).sort("published_date", -1)
    return await cursor.to_list(length=1000)


# --- Feature 5: Trend summaries ---

async def save_trend_summary(feed_type: str, summary: str, paper_count: int):
    await trend_summaries_collection.insert_one({
        "feed_type": feed_type,
        "summary": summary,
        "paper_count": paper_count,
        "created_at": datetime.utcnow(),
    })


async def get_latest_trend_summary(feed_type: str) -> dict | None:
    doc = await trend_summaries_collection.find_one(
        {"feed_type": feed_type},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    return doc


# --- Feature 8: Reading status ---

async def update_paper_reading_status(arxiv_id: str, status: str) -> bool:
    valid_statuses = {"new", "reading", "done", "starred"}
    if status not in valid_statuses:
        return False
    result = await papers_collection.update_one(
        {"arxiv_id": arxiv_id},
        {"$set": {"reading_status": status}},
    )
    return result.modified_count > 0


async def get_kanban_papers() -> dict:
    cursor = papers_collection.find(
        {},
        {"_id": 0, "arxiv_id": 1, "title": 1, "novelty_score": 1,
         "rl_category": 1, "reading_status": 1, "authors": 1, "published_date": 1},
    ).sort("published_date", -1)
    all_papers = await cursor.to_list(length=5000)

    result = {"new": [], "reading": [], "done": [], "starred": []}
    for paper in all_papers:
        status = paper.get("reading_status", "new")
        if status in result:
            result[status].append(paper)
    return result


# --- Feature 17: Notes ---

async def get_note(arxiv_id: str) -> dict | None:
    doc = await notes_collection.find_one({"arxiv_id": arxiv_id}, {"_id": 0})
    return doc


async def upsert_note(arxiv_id: str, content: str) -> dict:
    now = datetime.utcnow()
    await notes_collection.update_one(
        {"arxiv_id": arxiv_id},
        {"$set": {"arxiv_id": arxiv_id, "content": content, "updated_at": now}},
        upsert=True,
    )
    return {"arxiv_id": arxiv_id, "content": content, "updated_at": now.isoformat()}


async def delete_note(arxiv_id: str) -> bool:
    result = await notes_collection.delete_one({"arxiv_id": arxiv_id})
    return result.deleted_count > 0


# --- Feature 12: Settings ---

async def get_settings() -> dict:
    doc = await settings_collection.find_one({}, {"_id": 0})
    if not doc:
        return {
            "target_authors": os.getenv("TARGET_AUTHORS", "").split(","),
            "research_topics": os.getenv("RESEARCH_TOPICS", "").split(","),
            "arxiv_categories": os.getenv("ARXIV_CATEGORIES", "cs.LG,cs.AI,cs.RO").split(","),
        }
    return doc


async def save_settings(settings: dict) -> dict:
    await settings_collection.update_one(
        {},
        {"$set": {**settings, "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    return settings


# --- Feature 13: Custom feeds ---

async def get_custom_feeds() -> list:
    cursor = custom_feeds_collection.find({}, {"_id": 0})
    return await cursor.to_list(length=1000)


async def create_custom_feed(feed_data: dict) -> dict:
    from bson import ObjectId
    feed_data["created_at"] = datetime.utcnow()
    result = await custom_feeds_collection.insert_one(feed_data)
    feed_data["feed_id"] = str(result.inserted_id)
    feed_data.pop("_id", None)
    return feed_data


async def delete_custom_feed(feed_id: str) -> bool:
    from bson import ObjectId
    try:
        result = await custom_feeds_collection.delete_one({"_id": ObjectId(feed_id)})
        return result.deleted_count > 0
    except Exception:
        return False


async def get_custom_feed_by_id(feed_id: str) -> dict | None:
    from bson import ObjectId
    try:
        doc = await custom_feeds_collection.find_one({"_id": ObjectId(feed_id)}, {"_id": 0})
        return doc
    except Exception:
        return None


# --- Feature 14: Schedule state ---

async def get_schedule_state() -> dict:
    doc = await schedule_state_collection.find_one({"job_name": "main"}, {"_id": 0})
    if not doc:
        return {"enabled": True, "cron": os.getenv("SCHEDULE_CRON", "0 8 * * *"),
                "last_run": None, "next_run": None}
    return doc


async def update_schedule_state(update: dict) -> dict:
    await schedule_state_collection.update_one(
        {"job_name": "main"},
        {"$set": {**update, "job_name": "main"}},
        upsert=True,
    )
    return await get_schedule_state()
