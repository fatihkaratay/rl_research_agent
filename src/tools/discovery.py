import httpx
from collections import defaultdict
from src.database import db

# We will use a new MongoDB collection for the graphs
graphs_collection = db["author_graphs"]

async def build_author_graph(author_name: str, force_update: bool = False) -> dict:
    """
    Fetches an author's papers and builds a collaboration graph.
    Uses Semantic Scholar API to get accurate co-authorship and publication data.
    """
    # 1. Check database cache first (unless user clicked "Update")
    if not force_update:
        cached_graph = await graphs_collection.find_one({"target_author": author_name.lower()})
        if cached_graph:
            # Remove the MongoDB ObjectId before sending to React
            cached_graph.pop("_id", None) 
            return cached_graph

    print(f"Fetching Semantic Scholar data for: {author_name}")
    
    async with httpx.AsyncClient() as client:
        # 2. Search for the exact Author ID
        search_res = await client.get(f"https://api.semanticscholar.org/graph/v1/author/search?query={author_name}&limit=1")
        search_data = search_res.json()
        
        if not search_data.get("data"):
            return {"nodes": [], "links": [], "papers": []}
            
        author_id = search_data["data"][0]["authorId"]
        exact_name = search_data["data"][0]["name"]
        
        # 3. Fetch their recent papers with co-authors
        # We limit to 100 to avoid massive browser lag on the frontend physics engine
        papers_res = await client.get(
            f"https://api.semanticscholar.org/graph/v1/author/{author_id}/papers?fields=title,year,url,authors&limit=100"
        )
        papers_data = papers_res.json().get("data", [])

    # 4. Process the Graph Data
    node_weights = defaultdict(int)
    links = defaultdict(int)
    formatted_papers = []

    for paper in papers_data:
        paper_authors = [a["name"] for a in paper.get("authors", []) if a.get("name")]
        
        # Save paper for the bottom list
        if paper.get("title"):
            formatted_papers.append({
                "title": paper["title"],
                "year": paper.get("year", "Unknown"),
                "url": paper.get("url", "#"),
                "authors": paper_authors
            })

        # Build collaboration weights
        for co_author in paper_authors:
            node_weights[co_author] += 1
            if co_author != exact_name:
                # Create a link between the main author and the co-author
                link_key = tuple(sorted([exact_name, co_author]))
                links[link_key] += 1

    # 5. Format for react-force-graph
    nodes = [{"id": name, "val": weight * 2, "name": name} for name, weight in node_weights.items()]
    graph_links = [{"source": src, "target": tgt, "value": weight} for (src, tgt), weight in links.items()]

    # Sort papers by year (newest first)
    formatted_papers.sort(key=lambda x: str(x["year"]), reverse=True)

    final_graph = {
        "target_author": author_name.lower(),
        "display_name": exact_name,
        "nodes": nodes,
        "links": graph_links,
        "papers": formatted_papers
    }

    # 6. Save/Update cache in MongoDB
    await graphs_collection.update_one(
        {"target_author": author_name.lower()},
        {"$set": final_graph},
        upsert=True
    )

    return final_graph