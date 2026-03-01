from typing import TypedDict, List
from src.schemas import PaperMetadata, PaperAnalysis

class AgentState(TypedDict):
    """
    The shared memory for our LangGraph agent.
    Each node will read from and write to these specific variables.
    """
    # Tells the agent what to search for.
    feed_type: str
    # What the Hugging Face tool finds
    raw_papers: List[PaperMetadata]
    
    # What the Deduplicator filters down to
    new_papers: List[PaperMetadata]
    
    # What the LLM eventually produces
    analyzed_papers: List[PaperAnalysis]