from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class PaperMetadata(BaseModel):
    arxiv_id: str
    title: str
    authors: List[str]
    published_date: str
    summary_short: str
    pdf_url: str

class PaperAnalysis(BaseModel):
    novelty_score: int = Field(ge=1, le=10) # 1-10 scale
    key_innovation: str
    problem_addressed: str
    rl_category: str  # e.g., "Offline RL", "Multi-Agent"
    institutions: List[str] = Field(description="List of universities or research institutes the authors belong to.")
    turkish_summary: str
    trend_prediction: str
    processed_at: datetime = Field(default_factory=datetime.now)