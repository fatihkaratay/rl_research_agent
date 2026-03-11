"""Feature 3: Citation tracking via Semantic Scholar."""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from dotenv import load_dotenv

from src.database import papers_collection

load_dotenv()

logger = logging.getLogger(__name__)

_SS_REQUEST_DELAY = 1.0  # Semantic Scholar rate limit
_SS_BASE = "https://api.semanticscholar.org/graph/v1"


async def _fetch_citation_count(client: httpx.AsyncClient, arxiv_id: str) -> Optional[int]:
    """Fetch citation count for a single paper from Semantic Scholar."""
    url = f"{_SS_BASE}/paper/arXiv:{arxiv_id}?fields=citationCount"
    try:
        resp = await client.get(url, timeout=15.0)
        if resp.status_code == 404:
            logger.debug(f"Paper {arxiv_id} not found on Semantic Scholar")
            return None
        resp.raise_for_status()
        data = resp.json()
        return data.get("citationCount")
    except Exception as e:
        logger.error(f"Failed to fetch citation count for {arxiv_id}: {e}")
        return None


async def update_citation_counts() -> int:
    """
    Update citation counts for all papers in the DB that have an arxiv_id.
    Returns the number of papers updated.
    """
    logger.info("Starting citation count update...")

    cursor = papers_collection.find(
        {"arxiv_id": {"$exists": True, "$ne": ""}},
        {"arxiv_id": 1, "_id": 0},
    )
    all_papers = await cursor.to_list(length=5000)
    logger.info(f"Found {len(all_papers)} papers to check citation counts")

    updated_count = 0
    async with httpx.AsyncClient(timeout=15.0) as client:
        for paper in all_papers:
            arxiv_id = paper.get("arxiv_id")
            if not arxiv_id:
                continue

            citation_count = await _fetch_citation_count(client, arxiv_id)
            if citation_count is not None:
                await papers_collection.update_one(
                    {"arxiv_id": arxiv_id},
                    {
                        "$set": {
                            "citation_count": citation_count,
                            "citation_updated_at": datetime.now(timezone.utc),
                        }
                    },
                )
                updated_count += 1
                logger.debug(f"Updated citations for {arxiv_id}: {citation_count}")

            await asyncio.sleep(_SS_REQUEST_DELAY)

    logger.info(f"Citation update complete. Updated {updated_count} papers.")
    return updated_count
