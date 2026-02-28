import os
import requests
from typing import List
from datetime import datetime
from src.schemas import PaperMetadata
from dotenv import load_dotenv

load_dotenv()

def fetch_latest_rl_papers(limit: int = 5) -> List[PaperMetadata]:
    """
    Fetches the daily curated papers from Hugging Face and filters 
    for Reinforcement Learning topics.
    """
    url = os.getenv("HUGGINGFACE_URL")
    response = requests.get(url)
    response.raise_for_status()
    
    daily_papers = response.json()
    rl_papers = []
    
    topics_env = os.getenv("RESEARCH_TOPICS", "reinforcement learning")
    keywords = [topic.strip().lower() for topic in topics_env.split(",")]
    
    for item in daily_papers:
        paper = item.get("paper", {})
        title = paper.get("title", "")
        summary = paper.get("summary", "")
        
        # Check if the paper is relevant to our RL focus
        text_to_search = (title + " " + summary).lower()
        if any(keyword in text_to_search for keyword in keywords):
            
            authors = [author.get("name") for author in paper.get("authors", [])]
            paper_id = paper.get("id", "unknown")
            pub_date = paper.get("publishedAt", datetime.now().isoformat()).split("T")[0]
            
            rl_papers.append(
                PaperMetadata(
                    arxiv_id=paper_id,
                    title=title,
                    authors=authors,
                    published_date=pub_date,
                    summary_short=summary,
                    # HF uses ArXiv IDs, so we can still reconstruct the PDF link!
                    pdf_url=f"https://arxiv.org/pdf/{paper_id}.pdf"
                )
            )
            
            if len(rl_papers) >= limit:
                break
                
    return rl_papers