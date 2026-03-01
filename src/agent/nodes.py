from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from src.agent.state import AgentState
from src.schemas import PaperAnalysis
from src.database import check_if_exists

from src.tools.huggingface import fetch_latest_rl_papers
from src.database import insert_analyzed_paper
from src.tools.arxiv_authors import fetch_papers_by_authors

# 1. Initialize the LLM (It will automatically find OPENAI_API_KEY in your .env)
llm = ChatOpenAI(model="gpt-4o", temperature=0.2)

# 2. Force the LLM to output our exact Pydantic schema
structured_llm = llm.with_structured_output(PaperAnalysis)

# 3. Create the System Prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert Principal AI Research Scientist. 
    Analyze the provided Reinforcement Learning abstract.
    
    You must extract:
    1. The novelty score (1-10).
    2. The key innovation.
    3. The specific problem it addresses.
    4. The RL category (e.g., Offline RL, Multi-Agent, PPO, etc.).
    5. The Universities, Companies, or Research Institutes the authors are affiliated with (extract from text, or use your broad knowledge of AI researchers to infer the lab).
    6. A prediction on where this specific RL technology is heading.
    
    Finally, provide a comprehensive summary of the paper in TURKISH.
    """),
    ("user", "Title: {title}\nAuthors: {authors}\nAbstract: {summary}")
])

# 4. Chain them together
analyzer_chain = prompt | structured_llm

# --- DEDUPLICATOR NODE (Keep your existing code here) ---
async def filter_new_papers_node(state: AgentState) -> dict:
    raw_papers = state.get("raw_papers", [])
    new_papers = []
    print(f"Deduplicator starting with {len(raw_papers)} papers...")
    for paper in raw_papers:
        if not await check_if_exists(paper.arxiv_id):
            print(f"[NEW] {paper.arxiv_id} - {paper.title}")
            new_papers.append(paper)
        else:
            print(f"[SKIPPED] {paper.arxiv_id} already exists.")
    return {"new_papers": new_papers}

# --- NEW: ANALYSIS NODE ---
async def analyze_papers_node(state: AgentState) -> dict:
    """
    Takes the new papers, passes them to the LLM, and structures the output.
    """
    new_papers = state.get("new_papers", [])
    analyzed_results = []
    
    if not new_papers:
        print("No new papers to analyze.")
        return {"analyzed_papers": []}

    print(f"Starting AI Analysis on {len(new_papers)} papers...")

    for paper in new_papers:
        print(f"Thinking about: {paper.title}...")
        
        # Invoke the LLM with the paper's data
        analysis: PaperAnalysis = await analyzer_chain.ainvoke({
            "title": paper.title,
            "authors": ", ".join(paper.authors),
            "summary": paper.summary_short
        })
        
        # Combine the original metadata with the AI's analysis into a single dictionary
        # This makes it perfectly ready to insert into MongoDB!
        combined_document = {
            **paper.model_dump(),     # ID, Title, Authors, etc.
            **analysis.model_dump()   # Turkish Summary, Innovation, Trends, etc.
        }
        
        analyzed_results.append(combined_document)
        print(f"Analysis complete! Novelty Score: {analysis.novelty_score}/10")

    return {"analyzed_papers": analyzed_results}

async def fetch_papers_node(state: AgentState) -> dict:
    """Entry point: Grabs papers based on the requested feed_type."""
    feed_type = state.get("feed_type", "general")
    print(f"\n[NODE: FETCH] Searching for {feed_type} papers...")
    
    if feed_type == "author":
        papers = fetch_papers_by_authors()
    else:
        papers = fetch_latest_rl_papers()
        
    # Tag each paper with its feed_type so the database can organize them
    for paper in papers:
        paper.feed_type = feed_type
        
    return {"raw_papers": papers}

async def save_papers_node(state: AgentState) -> dict:
    """Exit point: Saves the final AI analysis to MongoDB."""
    analyzed_papers = state.get("analyzed_papers", [])
    
    if not analyzed_papers:
        print("\n[NODE: SAVE] No new papers to save today.")
        return {}

    print(f"\n[NODE: SAVE] Storing {len(analyzed_papers)} analyzed papers to MongoDB...")
    for paper_dict in analyzed_papers:
        # Insert into database
        await insert_analyzed_paper(paper_dict)
        print(f" -> Saved to DB: {paper_dict.get('title')}")

    return {} # We don't need to update the state further, the graph ends here.
