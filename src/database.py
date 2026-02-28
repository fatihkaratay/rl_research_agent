import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Defaults to local if .env is missing
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.rl_research_db
papers_collection = db.papers

async def check_if_exists(arxiv_id: str):
    """Check if we already processed this paper."""
    paper = await papers_collection.find_one({"arxiv_id": arxiv_id})
    return paper is not None

async def insert_analyzed_paper(data: dict):
    """Store the final agent output."""
    return await papers_collection.insert_one(data)