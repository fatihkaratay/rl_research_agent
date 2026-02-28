import arxiv
from typing import List
from src.schemas import PaperMetadata

def fetch_latest_rl_papers(limit: int = 5) -> List[PaperMetadata]:
    """
    Search ArXiv for Reinforcement Learning papers in the Computer Science 
    Learning (cs.LG) and AI (cs.AI) categories.
    """
    client = arxiv.Client()
    
    # query: Search for RL specifically within machine learning categories
    search = arxiv.Search(
        query='cat:cs.LG AND "reinforcement learning"',
        max_results=limit,
        sort_by=arxiv.SortCriterion.SubmittedDate
    )
    
    found_papers = []
    
    for result in client.results(search):
        # We map the raw API result to our clean Pydantic schema
        paper = PaperMetadata(
            arxiv_id=result.entry_id.split('/')[-1], # Get the ID from the URL
            title=result.title,
            authors=[author.name for author in result.authors],
            published_date=result.published.strftime("%Y-%m-%d"),
            summary_short=result.summary,
            pdf_url=result.pdf_url
        )
        found_papers.append(paper)
        
    return found_papers