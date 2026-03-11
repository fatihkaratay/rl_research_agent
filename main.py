import asyncio
import json
import logging
import logging.config
import os
from typing import Optional

import certifi
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# --- macOS SSL Fix ---
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

from src.agent.graph import research_graph
from src.database import (
    ensure_indexes,
    get_papers,
    get_agent_status,
    set_agent_status,
    toggle_bookmark,
    get_bookmark_ids,
    get_bookmarked_papers,
    papers_collection,
    get_note,
    upsert_note,
    delete_note,
    update_paper_reading_status,
    get_kanban_papers,
    get_latest_trend_summary,
    get_settings,
    save_settings,
    get_custom_feeds,
    create_custom_feed,
    delete_custom_feed,
    get_custom_feed_by_id,
    get_schedule_state,
    update_schedule_state,
    trend_summaries_collection,
)
from src.tools.discovery import build_author_graph
from src.tools.author_reputation import get_author_hindex


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    for feed_type in ["general", "author", "arxiv"]:
        await set_agent_status(feed_type, False)

    # Feature 14: Start scheduler
    from src.scheduler import start_scheduler, stop_scheduler
    await start_scheduler()

    logger.info("Server ready.")
    yield

    await stop_scheduler()


app = FastAPI(title="RL Research Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health check ---

@app.get("/health")
async def health():
    """Quick liveness probe — checks DB reachability."""
    try:
        from src.database import client
        await client.admin.command("ping")
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "degraded", "db": str(e)}


# --- Agent trigger & status ---

@app.get("/api/research/status/{feed_type}")
async def get_agent_status_endpoint(feed_type: str):
    return {"is_running": await get_agent_status(feed_type)}


@app.get("/api/research/stream/{feed_type}")
async def stream_agent_status(feed_type: str):
    async def event_generator():
        try:
            while True:
                is_running = await get_agent_status(feed_type)
                yield f"data: {json.dumps({'is_running': is_running})}\n\n"
                await asyncio.sleep(2 if is_running else 5)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/research/run/{feed_type}")
async def trigger_research(feed_type: str, background_tasks: BackgroundTasks):
    if await get_agent_status(feed_type):
        return {"message": f"Agent already running for '{feed_type}'."}

    await set_agent_status(feed_type, True)

    async def run_agent():
        try:
            logger.info(f"=== Agent started ({feed_type}) ===")
            initial_state = {
                "feed_type": feed_type,
                "raw_papers": [],
                "new_papers": [],
                "analyzed_papers": [],
            }
            await research_graph.ainvoke(initial_state)
            logger.info(f"=== Agent finished ({feed_type}) ===")
        except Exception as e:
            logger.error(f"=== Agent error ({feed_type}): {e} ===")
        finally:
            await set_agent_status(feed_type, False)

    background_tasks.add_task(run_agent)
    return {"message": f"Agent dispatched for '{feed_type}'."}


# Feature 13: Custom feed agent run
@app.post("/api/research/run/custom/{feed_id}")
async def trigger_custom_feed_research(feed_id: str, background_tasks: BackgroundTasks):
    feed = await get_custom_feed_by_id(feed_id)
    if not feed:
        raise HTTPException(status_code=404, detail="Custom feed not found")

    feed_key = f"custom_{feed_id}"
    if await get_agent_status(feed_key):
        return {"message": f"Agent already running for feed '{feed_id}'."}

    await set_agent_status(feed_key, True)

    async def run_custom_agent():
        try:
            logger.info(f"=== Custom feed agent started ({feed_id}) ===")
            initial_state = {
                "feed_type": feed_key,
                "raw_papers": [],
                "new_papers": [],
                "analyzed_papers": [],
                "custom_feed": feed,
            }
            await research_graph.ainvoke(initial_state)
            logger.info(f"=== Custom feed agent finished ({feed_id}) ===")
        except Exception as e:
            logger.error(f"=== Custom feed agent error ({feed_id}): {e} ===")
        finally:
            await set_agent_status(feed_key, False)

    background_tasks.add_task(run_custom_agent)
    return {"message": f"Custom feed agent dispatched for '{feed_id}'."}


# --- Papers with pagination + search + category filter ---

@app.get("/api/papers/{feed_type}")
async def get_analyzed_papers(
    feed_type: str,
    limit: int = 20,
    offset: int = 0,
    search: str = "",
    category: str = "",
):
    papers = await get_papers(feed_type, limit=limit, offset=offset, search=search, category=category)
    bookmark_ids = set(await get_bookmark_ids())
    # Fetch note indicator
    from src.database import notes_collection
    note_ids_cursor = notes_collection.find(
        {"arxiv_id": {"$in": [p.get("arxiv_id") for p in papers if p.get("arxiv_id")]}},
        {"arxiv_id": 1, "_id": 0},
    )
    note_ids = {doc["arxiv_id"] async for doc in note_ids_cursor}
    for p in papers:
        p["bookmarked"] = p.get("arxiv_id") in bookmark_ids
        p["has_note"] = p.get("arxiv_id") in note_ids
    return {"count": len(papers), "papers": papers}


# Feature 2: Similar papers — uses /api/paper/{arxiv_id}/similar (singular) to avoid route conflict
@app.get("/api/paper/{arxiv_id}/similar")
async def get_similar_papers(arxiv_id: str, top_k: int = 5):
    from src.tools.embeddings import get_similar_papers as _get_similar
    papers = await _get_similar(arxiv_id, top_k=top_k)
    return {"arxiv_id": arxiv_id, "similar": papers}


# Feature 8: Paper reading status — singular /api/paper/ prefix for per-paper ops
class StatusUpdate(BaseModel):
    status: str


@app.patch("/api/paper/{arxiv_id}/status")
async def update_paper_status(arxiv_id: str, body: StatusUpdate):
    valid = {"new", "reading", "done", "starred"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    updated = await update_paper_reading_status(arxiv_id, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"arxiv_id": arxiv_id, "status": body.status}


@app.get("/api/kanban")
async def get_kanban():
    return await get_kanban_papers()


# Feature 9: Paper comparison
@app.get("/api/compare")
async def compare_papers(ids: str = Query(...)):
    arxiv_ids = [i.strip() for i in ids.split(",") if i.strip()]
    if not arxiv_ids:
        raise HTTPException(status_code=400, detail="Provide at least one id")
    cursor = papers_collection.find(
        {"arxiv_id": {"$in": arxiv_ids}},
        {"_id": 0, "embedding": 0},
    )
    papers = await cursor.to_list(length=10)
    return {"papers": papers}


# Feature 10: Timeline analytics
@app.get("/api/analytics/timeline")
async def get_timeline():
    from collections import defaultdict
    import math

    cursor = papers_collection.find(
        {"published_date": {"$exists": True}},
        {"_id": 0, "published_date": 1, "rl_category": 1, "novelty_score": 1},
    )
    all_papers = await cursor.to_list(length=10000)

    # Group by ISO week
    weeks: dict = defaultdict(lambda: {"total": 0, "by_category": defaultdict(int), "novelty_sum": 0.0})

    for paper in all_papers:
        pub_date = paper.get("published_date", "")
        if not pub_date:
            continue
        try:
            from datetime import date
            d = date.fromisoformat(pub_date)
            week_key = f"{d.isocalendar()[0]}-W{d.isocalendar()[1]:02d}"
        except Exception:
            continue

        cat = paper.get("rl_category", "Other") or "Other"
        novelty = paper.get("novelty_score") or 0

        weeks[week_key]["total"] += 1
        weeks[week_key]["by_category"][cat] += 1
        weeks[week_key]["novelty_sum"] += novelty

    result = []
    for week, data in sorted(weeks.items()):
        total = data["total"]
        avg_novelty = round(data["novelty_sum"] / total, 2) if total > 0 else 0
        result.append({
            "week": week,
            "total": total,
            "by_category": dict(data["by_category"]),
            "avg_novelty": avg_novelty,
        })

    return result


# Feature 5: Trend summaries
@app.get("/api/trends/{feed_type}")
async def get_trend(feed_type: str):
    summary = await get_latest_trend_summary(feed_type)
    if not summary:
        raise HTTPException(status_code=404, detail="No trend summary found for this feed type")
    return summary


# Feature 11: Author profile
@app.get("/api/author/{author_name}")
async def get_author_profile(author_name: str):
    # Get Semantic Scholar author data
    rep = await get_author_hindex(author_name)

    # Get papers from our DB by this author
    cursor = papers_collection.find(
        {"authors": {"$regex": author_name, "$options": "i"}},
        {"_id": 0, "embedding": 0},
    ).sort("published_date", -1)
    db_papers = await cursor.to_list(length=100)

    # Get co-authors from discovery graph if available
    from src.database import db as mongo_db
    graphs_collection = mongo_db["author_graphs"]
    graph = await graphs_collection.find_one(
        {"target_author": author_name.lower()},
        {"_id": 0, "nodes": 1, "links": 1, "display_name": 1},
    )

    return {
        "author_name": author_name,
        "display_name": rep.get("name", author_name),
        "hIndex": rep.get("hIndex", 0),
        "citationCount": rep.get("citationCount", 0),
        "paperCount": rep.get("paperCount", 0),
        "affiliations": rep.get("affiliations", []),
        "papers": db_papers,
        "graph": graph or {"nodes": [], "links": []},
    }


# --- Discovery graph ---

@app.get("/api/discover/{author_name}")
async def get_discovery_graph(author_name: str, force_update: bool = False):
    try:
        return await build_author_graph(author_name, force_update)
    except Exception as e:
        logger.error(f"Graph error for '{author_name}': {e}")
        return {"nodes": [], "links": [], "papers": []}


# --- Bookmarks ---

@app.post("/api/bookmarks/{arxiv_id}")
async def bookmark_paper(arxiv_id: str):
    return await toggle_bookmark(arxiv_id)


@app.get("/api/bookmarks")
async def list_bookmarks():
    papers = await get_bookmarked_papers()
    return {"count": len(papers), "papers": papers}


# --- Feature 12: Settings ---

class SettingsBody(BaseModel):
    target_authors: list[str] = []
    research_topics: list[str] = []
    arxiv_categories: list[str] = []


@app.get("/api/settings")
async def api_get_settings():
    return await get_settings()


@app.post("/api/settings")
async def api_save_settings(body: SettingsBody):
    saved = await save_settings(body.model_dump())
    return saved


# --- Feature 13: Custom feeds ---

class FeedBody(BaseModel):
    name: str
    keywords: list[str] = []
    arxiv_categories: list[str] = []
    color: str = "#6366f1"


@app.get("/api/feeds")
async def list_feeds():
    feeds = await get_custom_feeds()
    return {"feeds": feeds}


@app.post("/api/feeds")
async def create_feed(body: FeedBody):
    feed = await create_custom_feed(body.model_dump())
    return feed


@app.delete("/api/feeds/{feed_id}")
async def remove_feed(feed_id: str):
    deleted = await delete_custom_feed(feed_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Feed not found")
    return {"deleted": True}


# --- Feature 14: Schedule management ---

class ScheduleUpdate(BaseModel):
    enabled: Optional[bool] = None
    cron: Optional[str] = None


@app.get("/api/schedule")
async def get_schedule():
    return await get_schedule_state()


@app.patch("/api/schedule")
async def patch_schedule(body: ScheduleUpdate):
    from src.scheduler import update_scheduler_cron
    state = await get_schedule_state()
    new_cron = body.cron if body.cron is not None else state.get("cron", "0 8 * * *")
    new_enabled = body.enabled if body.enabled is not None else state.get("enabled", True)
    await update_scheduler_cron(new_cron, new_enabled)
    return await get_schedule_state()


# --- Feature 16: Deep PDF analysis ---

@app.post("/api/paper/{arxiv_id}/deep-analyze")
async def deep_analyze(arxiv_id: str, background_tasks: BackgroundTasks):
    paper = await papers_collection.find_one({"arxiv_id": arxiv_id}, {"deep_analysis": 1, "_id": 0})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper.get("deep_analysis"):
        return {"message": "Paper already deep-analyzed", "arxiv_id": arxiv_id}

    async def run_deep():
        try:
            from src.tools.pdf_pipeline import deep_analyze_paper
            await deep_analyze_paper(arxiv_id)
        except Exception as e:
            logger.error(f"Deep analysis failed for {arxiv_id}: {e}")

    background_tasks.add_task(run_deep)
    return {"message": "Deep analysis started", "arxiv_id": arxiv_id}


# --- Feature 17: Notes ---

class NoteBody(BaseModel):
    content: str


@app.get("/api/paper/{arxiv_id}/notes")
async def get_paper_note(arxiv_id: str):
    note = await get_note(arxiv_id)
    if not note:
        return {"arxiv_id": arxiv_id, "content": "", "updated_at": None}
    return note


@app.put("/api/paper/{arxiv_id}/notes")
async def save_paper_note(arxiv_id: str, body: NoteBody):
    return await upsert_note(arxiv_id, body.content)


@app.delete("/api/paper/{arxiv_id}/notes")
async def remove_paper_note(arxiv_id: str):
    deleted = await delete_note(arxiv_id)
    return {"deleted": deleted}


# --- Config ---

@app.get("/api/config")
async def get_config():
    return {
        "discovery_author": os.getenv("DISCOVERY_AUTHOR", "Abhishek Cauligi"),
        "summary_language": os.getenv("SUMMARY_LANGUAGE", "Turkish"),
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
