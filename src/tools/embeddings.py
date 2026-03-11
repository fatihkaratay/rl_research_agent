"""Feature 2: Text embeddings + 'More like this' similarity search."""
import logging
import math
from typing import List, Optional

from dotenv import load_dotenv
from openai import AsyncOpenAI

from src.database import db, papers_collection

load_dotenv()

logger = logging.getLogger(__name__)

_openai_client: Optional[AsyncOpenAI] = None


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI()
    return _openai_client


async def embed_text(text: str) -> List[float]:
    """Embed text using OpenAI text-embedding-3-small."""
    client = _get_openai_client()
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],  # Respect token limits
    )
    return response.data[0].embedding


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


async def compute_and_store_embedding(arxiv_id: str, title: str, key_innovation: str) -> None:
    """Compute embedding for a paper and store it in the DB."""
    try:
        text = f"{title}. {key_innovation}"
        embedding = await embed_text(text)
        await papers_collection.update_one(
            {"arxiv_id": arxiv_id},
            {"$set": {"embedding": embedding}},
        )
        logger.info(f"Stored embedding for {arxiv_id}")
    except Exception as e:
        logger.error(f"Failed to compute embedding for {arxiv_id}: {e}")


async def get_similar_papers(arxiv_id: str, top_k: int = 5) -> List[dict]:
    """Find top-k similar papers by cosine similarity of embeddings."""
    source_doc = await papers_collection.find_one(
        {"arxiv_id": arxiv_id, "embedding": {"$exists": True}},
        {"embedding": 1, "_id": 0},
    )
    if not source_doc or not source_doc.get("embedding"):
        logger.warning(f"No embedding found for {arxiv_id}")
        return []

    source_embedding = source_doc["embedding"]

    # Fetch all other papers that have embeddings
    cursor = papers_collection.find(
        {"arxiv_id": {"$ne": arxiv_id}, "embedding": {"$exists": True}},
        {"_id": 0, "arxiv_id": 1, "title": 1, "novelty_score": 1,
         "rl_category": 1, "key_innovation": 1, "pdf_url": 1,
         "authors": 1, "published_date": 1, "embedding": 1},
    )
    candidates = await cursor.to_list(length=2000)

    scored = []
    for doc in candidates:
        emb = doc.pop("embedding", None)
        if emb:
            sim = _cosine_similarity(source_embedding, emb)
            scored.append((sim, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]
