import asyncio
from src.tools.arxiv import fetch_latest_rl_papers

async def main():
    print("Fetching papers from ArXiv...")
    # Fetch 2 papers just to test
    papers = fetch_latest_rl_papers(limit=2)
    
    for paper in papers:
        print(f"\n--- {paper.title} ---")
        print(f"ID: {paper.arxiv_id}")
        print(f"Published: {paper.published_date}")
        print(f"Authors: {', '.join(paper.authors)}")

if __name__ == "__main__":
    asyncio.run(main())