"""Feature 4: Direct ArXiv feed by category."""
import os
import logging
from typing import List

import arxiv
from dotenv import load_dotenv

from src.schemas import PaperMetadata

load_dotenv()

logger = logging.getLogger(__name__)

_DEFAULT_CATEGORIES = "cs.LG,cs.AI,cs.RO"


def fetch_arxiv_papers(
    categories: List[str] | None = None,
    max_results: int = 30,
) -> List[PaperMetadata]:
    """
    Fetch recent papers from ArXiv for given categories.
    Categories default to ARXIV_CATEGORIES env var.
    """
    if categories is None:
        env_cats = os.getenv("ARXIV_CATEGORIES", _DEFAULT_CATEGORIES)
        categories = [c.strip() for c in env_cats.split(",") if c.strip()]

    cat_query = " OR ".join(f"cat:{cat}" for cat in categories)
    logger.info(f"Fetching ArXiv papers for categories: {categories}")

    client = arxiv.Client()
    search = arxiv.Search(
        query=cat_query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.SubmittedDate,
    )

    papers = []
    for result in client.results(search):
        paper = PaperMetadata(
            arxiv_id=result.entry_id.split("/")[-1],
            title=result.title,
            authors=[author.name for author in result.authors],
            published_date=result.published.strftime("%Y-%m-%d"),
            summary_short=result.summary,
            pdf_url=result.pdf_url or f"https://arxiv.org/pdf/{result.entry_id.split('/')[-1]}.pdf",
            feed_type="arxiv",
        )
        papers.append(paper)

    logger.info(f"Fetched {len(papers)} ArXiv papers")
    return papers
