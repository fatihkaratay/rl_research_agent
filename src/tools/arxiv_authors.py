import os
import arxiv
from typing import List
from dotenv import load_dotenv
from src.schemas import PaperMetadata

# Load environment variables
load_dotenv()

def fetch_papers_by_authors(limit: int = 10) -> List[PaperMetadata]:
    """
    Searches the global ArXiv database for the most recent papers 
    published by the specific authors in our .env file.
    """
    # 1. Grab authors from .env (fallback to a default if missing)
    authors_env = os.getenv("TARGET_AUTHORS", "Sergey Levine")
    
    # 2. Clean up the list (remove extra spaces)
    author_list = [author.strip() for author in authors_env.split(",")]
    
    # 3. Construct the exact ArXiv query format: au:"Name" OR au:"Name"
    query_parts = [f'au:"{author}"' for author in author_list]
    search_query = " OR ".join(query_parts)
    
    print(f"Executing ArXiv Query: {search_query}")
    
    # 4. Connect to ArXiv
    client = arxiv.Client()
    search = arxiv.Search(
        query=search_query,
        max_results=limit,
        sort_by=arxiv.SortCriterion.SubmittedDate # Get the newest ones first
    )
    
    found_papers = []
    
    for result in client.results(search):
        paper = PaperMetadata(
            arxiv_id=result.entry_id.split('/')[-1],
            title=result.title,
            authors=[author.name for author in result.authors],
            published_date=result.published.strftime("%Y-%m-%d"),
            summary_short=result.summary,
            pdf_url=result.pdf_url
        )
        found_papers.append(paper)
        
    return found_papers