import os
import certifi
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# --- macOS SSL Fix ---
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

# Import your graph and database operations
from src.agent.graph import research_graph
from src.database import papers_collection

app = FastAPI(title="RL Research Agent API")

# Allow your future React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW: Global State Tracker ---
agent_status = {
    "general": False,
    "author": False
}

# --- API ENDPOINTS ---

@app.get("/api/research/status/{feed_type}")
async def get_agent_status(feed_type: str):
    """Allows the React frontend to check if the agent is currently running."""
    return {"is_running": agent_status.get(feed_type, False)}


@app.post("/api/research/run/{feed_type}")
async def trigger_research(feed_type: str, background_tasks: BackgroundTasks):
    """Triggers the agent and updates the global status."""
    
    # Don't start a second agent if one is already running
    if agent_status.get(feed_type, False):
        return {"message": f"Agent is already running for {feed_type}."}
        
    # Lock the status to True
    agent_status[feed_type] = True
    
    async def run_agent():
        try:
            print(f"=== Agent Started ({feed_type} mode) ===")
            initial_state = {
                "feed_type": feed_type, 
                "raw_papers": [], 
                "new_papers": [], 
                "analyzed_papers": []
            }
            await research_graph.ainvoke(initial_state)
            print(f"=== Agent Finished ({feed_type} mode) ===")
        except Exception as e:
            print(f"=== Agent Errored: {e} ===")
        finally:
            # PRINCIPAL ENGINEER TRICK: A 'finally' block ensures that even if 
            # OpenAI crashes, the UI won't be stuck loading forever.
            agent_status[feed_type] = False
            
    # Run the graph in the background
    background_tasks.add_task(run_agent)
    return {"message": f"Agent dispatched for {feed_type} papers!"}


@app.get("/api/papers/{feed_type}")
async def get_analyzed_papers(feed_type: str, limit: int = 20):
    """Fetches papers filtered by the specific feed."""
    if feed_type == "general":
        query = {"$or": [{"feed_type": "general"}, {"feed_type": {"$exists": False}}]}
    else:
        query = {"feed_type": feed_type}
        
    cursor = papers_collection.find(query, {"_id": 0}).sort("published_date", -1).limit(limit)
    papers = await cursor.to_list(length=limit)
    return {"count": len(papers), "papers": papers}

if __name__ == "__main__":
    print("Starting FastAPI server on http://127.0.0.1:8000 ...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    