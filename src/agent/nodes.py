import os
import asyncio
import logging

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from src.agent.state import AgentState
from src.schemas import PaperAnalysis
from src.database import check_if_exists, insert_analyzed_paper
from src.tools.huggingface import fetch_latest_rl_papers
from src.tools.arxiv_authors import fetch_papers_by_authors

logger = logging.getLogger(__name__)

# #10: Read summary language from env — no more hardcoded Turkish
SUMMARY_LANGUAGE = os.getenv("SUMMARY_LANGUAGE", "Turkish")

llm = ChatOpenAI(model="gpt-4o", temperature=0.2)
structured_llm = llm.with_structured_output(PaperAnalysis)

# #11: Few-shot calibration examples anchor the novelty scale across runs
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

Finally, provide a comprehensive summary of the paper in {summary_language}."""),
    ("user", "Title: {title}\nAuthors: {authors}\nAbstract: {summary}"),
])

analyzer_chain = prompt | structured_llm


# #7: Extracted so asyncio.gather() can run all analyses in parallel
async def _analyze_single(paper) -> dict | None:
    try:
        logger.info(f"Analyzing: {paper.title[:80]}")
        analysis: PaperAnalysis = await analyzer_chain.ainvoke({
            "title": paper.title,
            "authors": ", ".join(paper.authors),
            "summary": paper.summary_short,
            "summary_language": SUMMARY_LANGUAGE,
        })
        logger.info(f"Novelty {analysis.novelty_score}/10 — {paper.title[:60]}")
        return {**paper.model_dump(), **analysis.model_dump()}
    except Exception as e:
        logger.error(f"Failed to analyze '{paper.title}': {e}")
        return None


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

    # #7: Parallel LLM calls — dramatically faster than sequential
    results = await asyncio.gather(*[_analyze_single(p) for p in new_papers])
    analyzed_results = [r for r in results if r is not None]

    # #9: Rough token/cost estimate (GPT-4o: ~$5/1M input, ~$15/1M output)
    est_tokens = len(new_papers) * 900
    est_cost = est_tokens * 0.000007  # blended rate estimate
    logger.info(
        f"Batch done — {len(analyzed_results)}/{len(new_papers)} succeeded | "
        f"Est. ~{est_tokens:,} tokens | Est. cost ~${est_cost:.3f}"
    )

    return {"analyzed_papers": analyzed_results}


async def fetch_papers_node(state: AgentState) -> dict:
    feed_type = state.get("feed_type", "general")
    logger.info(f"[FETCH] feed_type='{feed_type}'")
    papers = fetch_papers_by_authors() if feed_type == "author" else fetch_latest_rl_papers()
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
    for paper_dict in analyzed_papers:
        await insert_analyzed_paper(paper_dict)
        logger.debug(f"Saved: {paper_dict.get('title')}")
    return {}
