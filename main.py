import asyncio
import json
import logging
import logging.config
import os

import certifi
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# --- macOS SSL Fix ---
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

# #16: Structured logging — replaces all print() calls across the app
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
)
from src.tools.discovery import build_author_graph


# #4: DB-backed agent status — no more in-memory dict that resets on restart
# #13 + #15: Indexes created at startup via ensure_indexes()
@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    # Clear any stale "running" flags left over from a crashed previous session
    for feed_type in ["general", "author"]:
        await set_agent_status(feed_type, False)
    logger.info("Server ready.")
    yield


app = FastAPI(title="RL Research Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- #17: Health check endpoint ---

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


# #8: SSE stream replaces hard polling — server pushes status every 2-5s
@app.get("/api/research/stream/{feed_type}")
async def stream_agent_status(feed_type: str):
    async def event_generator():
        try:
            while True:
                is_running = await get_agent_status(feed_type)
                yield f"data: {json.dumps({'is_running': is_running})}\n\n"
                # Poll DB more often while agent is active
                await asyncio.sleep(2 if is_running else 5)
        except asyncio.CancelledError:
            pass  # Client disconnected — stop cleanly

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


# --- #14: Papers with pagination + search + category filter ---

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
    for p in papers:
        p["bookmarked"] = p.get("arxiv_id") in bookmark_ids
    return {"count": len(papers), "papers": papers}


# --- Discovery graph ---

@app.get("/api/discover/{author_name}")
async def get_discovery_graph(author_name: str, force_update: bool = False):
    try:
        return await build_author_graph(author_name, force_update)
    except Exception as e:
        logger.error(f"Graph error for '{author_name}': {e}")
        return {"nodes": [], "links": [], "papers": []}


# --- #19: Bookmark endpoints ---

@app.post("/api/bookmarks/{arxiv_id}")
async def bookmark_paper(arxiv_id: str):
    return await toggle_bookmark(arxiv_id)


@app.get("/api/bookmarks")
async def list_bookmarks():
    papers = await get_bookmarked_papers()
    return {"count": len(papers), "papers": papers}


# --- Config ---

@app.get("/api/config")
async def get_config():
    return {
        "discovery_author": os.getenv("DISCOVERY_AUTHOR", "Abhishek Cauligi"),
        "summary_language": os.getenv("SUMMARY_LANGUAGE", "Turkish"),  # #10
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
