"""Feature 16: PDF deep analysis pipeline."""
import logging
import io
from typing import Optional

import httpx
import pdfplumber
from dotenv import load_dotenv

from src.database import papers_collection

load_dotenv()

logger = logging.getLogger(__name__)

MAX_PDF_PAGES = 10


async def download_and_extract_pdf(pdf_url: str) -> str:
    """Download a PDF and extract text from the first MAX_PDF_PAGES pages."""
    logger.info(f"Downloading PDF: {pdf_url}")
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        resp = await client.get(pdf_url)
        resp.raise_for_status()
        pdf_bytes = resp.content

    logger.info(f"PDF downloaded ({len(pdf_bytes)} bytes), extracting text...")
    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages_to_read = min(len(pdf.pages), MAX_PDF_PAGES)
        for i, page in enumerate(pdf.pages[:pages_to_read]):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(f"[Page {i+1}]\n{page_text}")

    full_text = "\n\n".join(text_parts)
    logger.info(f"Extracted {len(full_text)} chars from {pages_to_read} pages")
    return full_text


async def deep_analyze_paper(arxiv_id: str) -> dict:
    """
    Fetch paper from DB, download PDF, re-run analysis with full text.
    Updates the paper document with deep_analysis: True and refreshed fields.
    """
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from src.schemas import PaperAnalysis
    import os

    paper = await papers_collection.find_one({"arxiv_id": arxiv_id}, {"_id": 0})
    if not paper:
        raise ValueError(f"Paper {arxiv_id} not found in DB")

    pdf_url = paper.get("pdf_url")
    if not pdf_url:
        raise ValueError(f"No PDF URL for paper {arxiv_id}")

    full_text = await download_and_extract_pdf(pdf_url)
    summary_language = os.getenv("SUMMARY_LANGUAGE", "Turkish")

    llm = ChatOpenAI(model="gpt-4o", temperature=0.2)
    structured_llm = llm.with_structured_output(PaperAnalysis)

    deep_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert Principal AI Research Scientist performing a deep analysis.
You have access to the full paper text (first 10 pages). Use it for a more thorough analysis.

**Novelty Score Calibration (1-10):**
- Score 2: Applies an existing RL algorithm to a new game with no algorithmic change.
- Score 4: Adds a reward shaping technique to an existing offline RL baseline with modest gains.
- Score 6: Proposes a new training curriculum for multi-agent RL, validated on 3 benchmarks.
- Score 8: Introduces a new model-based RL algorithm outperforming all prior work on 10 benchmarks.
- Score 10: A unified framework that subsumes all prior RL approaches — reserve for truly landmark papers.

Extract: novelty score, key innovation, problem addressed, RL category, institutions, summary, trend prediction.
Provide a comprehensive summary in {summary_language}."""),
        ("user", "Title: {title}\nAuthors: {authors}\n\nFull Text (first 10 pages):\n{full_text}"),
    ])

    chain = deep_prompt | structured_llm
    analysis: PaperAnalysis = await chain.ainvoke({
        "title": paper.get("title", ""),
        "authors": ", ".join(paper.get("authors", [])),
        "full_text": full_text[:15000],  # Limit context size
        "summary_language": summary_language,
    })

    update_data = {
        **analysis.model_dump(),
        "deep_analysis": True,
        "deep_analyzed_at": __import__("datetime").datetime.utcnow(),
    }

    await papers_collection.update_one(
        {"arxiv_id": arxiv_id},
        {"$set": update_data},
    )
    logger.info(f"Deep analysis complete for {arxiv_id}: novelty={analysis.novelty_score}/10")
    return update_data
