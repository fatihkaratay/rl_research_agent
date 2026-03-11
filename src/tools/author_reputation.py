"""Feature 7: Author reputation signal via Semantic Scholar."""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from dotenv import load_dotenv

from src.database import db

load_dotenv()

logger = logging.getLogger(__name__)

_SS_REQUEST_DELAY = 1.0
_CACHE_TTL_DAYS = 30
_SS_BASE = "https://api.semanticscholar.org/graph/v1"

author_reputation_cache = db["author_reputation_cache"]


async def get_author_hindex(author_name: str) -> dict:
    """
    Look up an author's h-index and stats from Semantic Scholar.
    Results are cached in MongoDB for 30 days.
    """
    # Check cache first
    cached = await author_reputation_cache.find_one({"author_name": author_name.lower()})
    if cached:
        cached_at = cached.get("cached_at")
        if cached_at and (datetime.now(timezone.utc) - cached_at.replace(tzinfo=timezone.utc)).days < _CACHE_TTL_DAYS:
            logger.debug(f"Author reputation cache hit for '{author_name}'")
            return {
                "name": cached.get("name", author_name),
                "hIndex": cached.get("hIndex", 0),
                "citationCount": cached.get("citationCount", 0),
                "paperCount": cached.get("paperCount", 0),
                "affiliations": cached.get("affiliations", []),
            }

    logger.info(f"Fetching Semantic Scholar author data for: {author_name}")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Search for the author
            search_resp = await client.get(
                f"{_SS_BASE}/author/search",
                params={"query": author_name, "limit": 1,
                        "fields": "name,hIndex,citationCount,paperCount,affiliations"},
                timeout=15.0,
            )
            search_resp.raise_for_status()
            search_data = search_resp.json()

            if not search_data.get("data"):
                logger.warning(f"No Semantic Scholar data found for '{author_name}'")
                return {"name": author_name, "hIndex": 0, "citationCount": 0, "paperCount": 0, "affiliations": []}

            await asyncio.sleep(_SS_REQUEST_DELAY)

            author_data = search_data["data"][0]
            author_id = author_data.get("authorId")

            # Fetch detailed profile
            detail_resp = await client.get(
                f"{_SS_BASE}/author/{author_id}",
                params={"fields": "name,hIndex,citationCount,paperCount,affiliations"},
                timeout=15.0,
            )
            detail_resp.raise_for_status()
            detail = detail_resp.json()

        result = {
            "name": detail.get("name", author_name),
            "hIndex": detail.get("hIndex", 0),
            "citationCount": detail.get("citationCount", 0),
            "paperCount": detail.get("paperCount", 0),
            "affiliations": [a.get("name", "") for a in detail.get("affiliations", [])],
        }

        # Cache the result
        await author_reputation_cache.update_one(
            {"author_name": author_name.lower()},
            {"$set": {**result, "author_name": author_name.lower(), "cached_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        logger.info(f"Cached reputation for '{author_name}': hIndex={result['hIndex']}")
        return result

    except Exception as e:
        logger.error(f"Failed to fetch author reputation for '{author_name}': {e}")
        return {"name": author_name, "hIndex": 0, "citationCount": 0, "paperCount": 0, "affiliations": []}
