import os
import certifi
import asyncio

# --- macOS SSL Fix ---
# Forces Python to use the certifi bundle for HTTPS requests
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
# ---------------------

from src.agent.graph import research_graph

async def main():
    print("=== Starting RL Research Agent Pipeline ===")
    
    initial_state = {
        "raw_papers": [], 
        "new_papers": [], 
        "analyzed_papers": []
    }
    
    result = await research_graph.ainvoke(initial_state)
    
    print("\n=== Pipeline Complete! ===")
    print(f"Total Papers Found: {len(result.get('raw_papers', []))}")
    print(f"New Papers Analyzed: {len(result.get('new_papers', []))}")

if __name__ == "__main__":
    asyncio.run(main())