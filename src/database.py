import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Get values with fallbacks
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "rl_research_db")

# initialize client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
papers_collection = db.papers

async def check_if_exists(arxiv_id: str) -> bool:
    """
    Returns True if the paper is already in our database.
    This is our 'Deduplicator' logic foundation.
    """
    count = await papers_collection.count_documents({"arxiv_id": arxiv_id})
    return count > 0

async def insert_analyzed_paper(data: dict):
    """Saves the final AI analysis to MongoDB."""
    result = await papers_collection.insert_one(data)
    return result.inserted_id