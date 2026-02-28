import os
import asyncio
from src.tools.huggingface import fetch_latest_rl_papers 
from dotenv import load_dotenv

load_dotenv()

async def main():
    print("Fetching curated papers from Hugging Face...")
    papers = fetch_latest_rl_papers(limit=int(os.getenv("MAX_RESEARCH_RESULTS")))
    
    if not papers:
        print("No high-signal RL papers trending today. (This is good! Saves tokens).")
        
    for i, paper in enumerate(papers):
        print(f"\n{i+1}-{paper.title} ---")
        print(f"ID: {paper.arxiv_id}")
        print(f"Published: {paper.published_date}")
        print(f"Authors: {', '.join(paper.authors)}")

if __name__ == "__main__":
    asyncio.run(main())