import asyncio
import httpx
import logging
import os
from collections import defaultdict
from src.database import db, papers_collection

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

graphs_collection = db["author_graphs"]

# #6: Semantic Scholar rate limit is ~100 req/5min unauthenticated
_SS_REQUEST_DELAY = 1.0  # seconds between API calls


async def build_author_graph(author_name: str, force_update: bool = False) -> dict:
    if not force_update:
        cached_graph = await graphs_collection.find_one({"target_author": author_name.lower()})
        if cached_graph:
            cached_graph.pop("_id", None)
            logger.info(f"Serving cached graph for '{author_name}'")
            return cached_graph

    logger.info(f"Fetching Semantic Scholar data for: {author_name}")

    # #6: Use a single client with timeout; add delay between requests
    async with httpx.AsyncClient(timeout=15.0) as client:
        search_res = await client.get(
            f"https://api.semanticscholar.org/graph/v1/author/search?query={author_name}&limit=1"
        )
        search_res.raise_for_status()
        search_data = search_res.json()

        if not search_data.get("data"):
            logger.warning(f"No Semantic Scholar author found for '{author_name}'")
            return {"nodes": [], "links": [], "papers": []}

        author_id = search_data["data"][0]["authorId"]
        exact_name = search_data["data"][0]["name"]
        logger.info(f"Found author: {exact_name} (id={author_id})")

        # #6: Pause between requests to respect rate limits
        await asyncio.sleep(_SS_REQUEST_DELAY)

        papers_res = await client.get(
            f"https://api.semanticscholar.org/graph/v1/author/{author_id}/papers"
            f"?fields=title,year,url,authors,abstract,externalIds&limit=100"
        )
        papers_res.raise_for_status()
        papers_data = papers_res.json().get("data", [])

    logger.info(f"Retrieved {len(papers_data)} papers for {exact_name}")

    node_weights = defaultdict(int)
    links = defaultdict(int)
    formatted_papers = []

    for paper in papers_data:
        paper_authors = [a["name"] for a in paper.get("authors", []) if a.get("name")]

        arxiv_id = paper.get("externalIds", {}).get("ArXiv") if paper.get("externalIds") else None
        ai_data = None
        if arxiv_id:
            ai_data = await papers_collection.find_one({"arxiv_id": arxiv_id})
        if not ai_data and paper.get("title"):
            ai_data = await papers_collection.find_one({"title": paper.get("title")})

        paper_dict = {
            "title": paper.get("title"),
            "year": paper.get("year", "Unknown"),
            "url": paper.get("url", "#"),
            "authors": paper_authors,
            "abstract": paper.get("abstract", "No abstract available from Semantic Scholar."),
        }

        if ai_data:
            paper_dict["has_ai_analysis"] = True
            paper_dict["novelty_score"] = ai_data.get("novelty_score")
            paper_dict["key_innovation"] = ai_data.get("key_innovation")
            paper_dict["problem_addressed"] = ai_data.get("problem_addressed")
            paper_dict["rl_category"] = ai_data.get("rl_category")
            # #10: support both old field name and new generic name
            paper_dict["summary"] = ai_data.get("summary") or ai_data.get("turkish_summary")
            paper_dict["trend_prediction"] = ai_data.get("trend_prediction")
        else:
            paper_dict["has_ai_analysis"] = False

        if paper.get("title"):
            formatted_papers.append(paper_dict)

        for co_author in paper_authors:
            node_weights[co_author] += 1
            if co_author != exact_name:
                link_key = tuple(sorted([exact_name, co_author]))
                links[link_key] += 1

    sorted_authors = sorted(node_weights.items(), key=lambda item: item[1], reverse=True)
    MAX_NODES = int(os.getenv("MAX_NODES", 20))
    top_authors = set(author for author, _ in sorted_authors[:MAX_NODES])
    top_authors.add(exact_name)

    nodes = [
        {"id": name, "val": weight * 2, "name": name}
        for name, weight in node_weights.items()
        if name in top_authors
    ]
    graph_links = [
        {"source": src, "target": tgt, "value": weight}
        for (src, tgt), weight in links.items()
        if src in top_authors and tgt in top_authors
    ]

    formatted_papers.sort(key=lambda x: str(x["year"]), reverse=True)

    final_graph = {
        "target_author": author_name.lower(),
        "display_name": exact_name,
        "nodes": nodes,
        "links": graph_links,
        "papers": formatted_papers,
    }

    await graphs_collection.update_one(
        {"target_author": author_name.lower()},
        {"$set": final_graph},
        upsert=True,
    )

    logger.info(f"Graph built: {len(nodes)} nodes, {len(graph_links)} links")
    return final_graph
