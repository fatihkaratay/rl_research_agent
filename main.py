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
    allow_origins=["*"], # In production, restrict this to "http://localhost:3000"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def run_agent_pipeline():
    """The background worker that runs the LangGraph state machine."""
    print("=== Background Agent Triggered ===")
    initial_state = {"raw_papers": [], "new_papers": [], "analyzed_papers": []}
    await research_graph.ainvoke(initial_state)
    print("=== Background Agent Finished ===")


# --- API ENDPOINTS ---

@app.post("/api/research/run")
async def trigger_research(background_tasks: BackgroundTasks):
    """Tells the LangGraph agent to start researching in the background."""
    # We run this in the background so the HTTP request doesn't timeout 
    # while waiting for the LLM to read 5 papers.
    background_tasks.add_task(run_agent_pipeline)
    return {"message": "Agent has been dispatched! Check the database shortly."}

@app.get("/api/papers")
async def get_analyzed_papers(limit: int = 20):
    """Fetches the processed papers from MongoDB for the React frontend."""
    # Fetch papers, sorted by the newest published date
    cursor = papers_collection.find({}, {"_id": 0}).sort("published_date", -1).limit(limit)
    papers = await cursor.to_list(length=limit)
    
    return {"count": len(papers), "papers": papers}

if __name__ == "__main__":
    # Start the server on port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)