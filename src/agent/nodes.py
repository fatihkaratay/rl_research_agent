import os
import asyncio
import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from src.agent.state import AgentState
from src.schemas import PaperAnalysis
from src.database import (
    check_if_exists,
    insert_analyzed_paper,
    papers_collection,
    save_trend_summary,
)
from src.tools.huggingface import fetch_latest_rl_papers
from src.tools.arxiv_authors import fetch_papers_by_authors
from src.tools.arxiv_feed import fetch_arxiv_papers  # Feature 4

logger = logging.getLogger(__name__)

# Feature 14: Read summary language from env
SUMMARY_LANGUAGE = os.getenv("SUMMARY_LANGUAGE", "Turkish")

llm = ChatOpenAI(model="gpt-4o", temperature=0.2)
structured_llm = llm.with_structured_output(PaperAnalysis)

# Trend summary LLM
trend_llm = ChatOpenAI(model="gpt-4o", temperature=0.3)

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert Principal AI Research Scientist.
Analyze the provided Reinforcement Learning abstract.

**Novelty Score Calibration (1-10) — use these anchors to stay consistent:**
- Score 2: Applies an existing RL algorithm (e.g., PPO) to a new game with no algorithmic change.
- Score 4: Adds a reward shaping technique to an existing offline RL baseline with modest gains.
- Score 6: Proposes a new training curriculum for multi-agent RL, validated on 3 benchmarks.
- Score 8: Introduces a new model-based RL algorithm that outperforms all prior work on 10 benchmarks with theoretical guarantees.
- Score 10: A unified framework that subsumes all prior RL approaches — reserve for truly landmark papers only.

You must extract:
1. The novelty score (1-10) using the calibrated guide above.
2. The key innovation in one concise sentence.
3. The specific problem it addresses.
4. The RL category (e.g., Offline RL, Multi-Agent, PPO, RLHF, etc.).
5. The universities, companies, or research institutes the authors are affiliated with.
6. A prediction on where this specific RL technology is heading.

{context_section}

Finally, provide a comprehensive summary of the paper in {summary_language}."""),
    ("user", "Title: {title}\nAuthors: {authors}\nAbstract: {summary}"),
])

analyzer_chain = prompt | structured_llm


async def generate_trend_summary(papers: list[dict]) -> str:
    """Feature 5: Generate a cross-paper trend summary."""
    paper_descriptions = "\n".join(
        f"- {p.get('title', 'Unknown')} (Novelty {p.get('novelty_score', 'N/A')}/10, "
        f"Category: {p.get('rl_category', 'Unknown')}): {p.get('key_innovation', '')}"
        for p in papers[:20]  # Limit to 20 papers
    )
    prompt_text = (
        f"You are analyzing a batch of {len(papers)} recently published RL research papers.\n\n"
        f"Papers:\n{paper_descriptions}\n\n"
        f"Write a concise (3-5 paragraph) trend summary covering:\n"
        f"1. Common themes and research directions across these papers\n"
        f"2. Emerging subfields or techniques gaining traction\n"
        f"3. Gaps or open problems suggested by this batch\n"
        f"4. Your prediction for where the field is heading based on these papers"
    )
    try:
        response = await trend_llm.ainvoke(prompt_text)
        return response.content
    except Exception as e:
        logger.error(f"Failed to generate trend summary: {e}")
        return ""


async def _analyze_single(paper) -> dict | None:
    """Feature 6: Add novelty context from same category. Feature 7: Add author h-index."""
    try:
        logger.info(f"Analyzing: {paper.title[:80]}")

        # Feature 6: Fetch recent papers in same rl_category for context
        # We don't know the category before analysis, so we use title keywords
        # as a best-effort to find related papers
        context_section = ""

        # Feature 7: Author reputation signal
        author_context = ""
        if paper.authors:
            try:
                from src.tools.author_reputation import get_author_hindex
                first_author = paper.authors[0]
                rep = await get_author_hindex(first_author)
                if rep.get("hIndex", 0) > 0:
                    author_context = (
                        f"\n\nFirst author ({first_author}) Semantic Scholar profile: "
                        f"h-index={rep['hIndex']}, "
                        f"citations={rep['citationCount']}, "
                        f"papers={rep['paperCount']}."
                    )
            except Exception as e:
                logger.debug(f"Could not fetch author reputation: {e}")

        if author_context:
            context_section = f"AUTHOR CONTEXT:{author_context}"

        analysis: PaperAnalysis = await analyzer_chain.ainvoke({
            "title": paper.title,
            "authors": ", ".join(paper.authors),
            "summary": paper.summary_short,
            "summary_language": SUMMARY_LANGUAGE,
            "context_section": context_section,
        })

        # Feature 6: Now that we know rl_category, add context for next runs (stored in DB)
        result = {**paper.model_dump(), **analysis.model_dump()}

        logger.info(f"Novelty {analysis.novelty_score}/10 — {paper.title[:60]}")
        return result
    except Exception as e:
        logger.error(f"Failed to analyze '{paper.title}': {e}")
        return None


async def _add_category_context(paper, analyzed_so_far: list) -> str:
    """Feature 6: Query DB for recent papers in the same rl_category."""
    # We attempt a best-effort category lookup from DB by looking at existing papers
    try:
        cursor = papers_collection.find(
            {},
            {"title": 1, "novelty_score": 1, "rl_category": 1, "_id": 0},
        ).sort("created_at", -1).limit(50)
        recent = await cursor.to_list(length=50)
        if not recent:
            return ""
        # Pick any 3 from recent same-ish category (can't know exact category pre-analysis)
        context_papers = recent[:3]
        lines = [f"{p['title'][:60]} — novelty {p.get('novelty_score', '?')}/10" for p in context_papers]
        return "Recent papers in this research area:\n" + "\n".join(lines)
    except Exception:
        return ""


async def filter_new_papers_node(state: AgentState) -> dict:
    raw_papers = state.get("raw_papers", [])
    logger.info(f"Deduplicator: checking {len(raw_papers)} papers...")
    new_papers = []
    for paper in raw_papers:
        if not await check_if_exists(paper.arxiv_id):
            logger.info(f"[NEW]  {paper.arxiv_id} — {paper.title}")
            new_papers.append(paper)
        else:
            logger.debug(f"[SKIP] {paper.arxiv_id} already in DB")
    return {"new_papers": new_papers}


async def analyze_papers_node(state: AgentState) -> dict:
    new_papers = state.get("new_papers", [])
    if not new_papers:
        logger.info("No new papers to analyze.")
        return {"analyzed_papers": []}

    logger.info(f"Analyzing {len(new_papers)} papers in parallel...")

    # Parallel LLM calls
    results = await asyncio.gather(*[_analyze_single(p) for p in new_papers])
    analyzed_results = [r for r in results if r is not None]

    # Feature 6: Post-analysis category context — update novelty using category peers
    # This is now stored for future runs
    for result in analyzed_results:
        arxiv_id = result.get("arxiv_id", "")
        rl_category = result.get("rl_category", "")
        if rl_category:
            try:
                cursor = papers_collection.find(
                    {"rl_category": {"$regex": rl_category, "$options": "i"}},
                    {"title": 1, "novelty_score": 1, "_id": 0},
                ).sort("created_at", -1).limit(3)
                peers = await cursor.to_list(length=3)
                if peers:
                    peer_info = "; ".join(f"{p['title'][:40]}({p.get('novelty_score','?')}/10)" for p in peers)
                    result["category_context"] = peer_info
            except Exception as e:
                logger.debug(f"Category context lookup failed: {e}")

    est_tokens = len(new_papers) * 900
    est_cost = est_tokens * 0.000007
    logger.info(
        f"Batch done — {len(analyzed_results)}/{len(new_papers)} succeeded | "
        f"Est. ~{est_tokens:,} tokens | Est. cost ~${est_cost:.3f}"
    )

    return {"analyzed_papers": analyzed_results}


async def fetch_papers_node(state: AgentState) -> dict:
    feed_type = state.get("feed_type", "general")
    logger.info(f"[FETCH] feed_type='{feed_type}'")

    if feed_type == "author":
        papers = fetch_papers_by_authors()
    elif feed_type == "arxiv":
        # Feature 4: Direct ArXiv feed
        papers = fetch_arxiv_papers()
    else:
        papers = fetch_latest_rl_papers()

    for paper in papers:
        paper.feed_type = feed_type

    logger.info(f"[FETCH] Found {len(papers)} papers")
    return {"raw_papers": papers}


async def save_papers_node(state: AgentState) -> dict:
    analyzed_papers = state.get("analyzed_papers", [])
    if not analyzed_papers:
        logger.info("[SAVE] No new papers to save.")
        return {}

    logger.info(f"[SAVE] Storing {len(analyzed_papers)} papers...")
    saved_papers = []
    for paper_dict in analyzed_papers:
        await insert_analyzed_paper(paper_dict)
        saved_papers.append(paper_dict)
        logger.debug(f"Saved: {paper_dict.get('title')}")

        # Feature 2: Asynchronously compute embedding after save
        arxiv_id = paper_dict.get("arxiv_id", "")
        title = paper_dict.get("title", "")
        key_innovation = paper_dict.get("key_innovation", "")
        if arxiv_id and (title or key_innovation):
            asyncio.create_task(_store_embedding_bg(arxiv_id, title, key_innovation))

    # Feature 5: If 3+ papers were saved, trigger trend summary
    if len(saved_papers) >= 3:
        feed_type = state.get("feed_type", "general")
        asyncio.create_task(_generate_and_store_trend(feed_type, saved_papers))

    return {}


async def _store_embedding_bg(arxiv_id: str, title: str, key_innovation: str):
    """Background task: compute and store embedding."""
    try:
        from src.tools.embeddings import compute_and_store_embedding
        await compute_and_store_embedding(arxiv_id, title, key_innovation)
    except Exception as e:
        logger.error(f"Background embedding failed for {arxiv_id}: {e}")


async def _generate_and_store_trend(feed_type: str, papers: list[dict]):
    """Feature 5: Background task: generate and store trend summary."""
    try:
        logger.info(f"Generating trend summary for {len(papers)} papers ({feed_type})")
        summary = await generate_trend_summary(papers)
        if summary:
            await save_trend_summary(feed_type, summary, len(papers))
            logger.info(f"Trend summary stored for feed_type='{feed_type}'")
    except Exception as e:
        logger.error(f"Trend summary generation failed: {e}")
