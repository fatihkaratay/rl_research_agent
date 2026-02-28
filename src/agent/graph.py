from langgraph.graph import StateGraph, END
from src.agent.state import AgentState
from src.agent.nodes import (
    fetch_papers_node,
    filter_new_papers_node,
    analyze_papers_node,
    save_papers_node
)

# 1. Initialize the Graph using our shared whiteboard (AgentState)
workflow = StateGraph(AgentState)

# 2. Add our "Workers" (Nodes)
workflow.add_node("fetch", fetch_papers_node)
workflow.add_node("deduplicate", filter_new_papers_node)
workflow.add_node("analyze", analyze_papers_node)
workflow.add_node("save", save_papers_node)

# 3. Define the "Conveyor Belt" (Edges)
workflow.set_entry_point("fetch")
workflow.add_edge("fetch", "deduplicate")
workflow.add_edge("deduplicate", "analyze")
workflow.add_edge("analyze", "save")
workflow.add_edge("save", END)

# 4. Compile the graph into an executable application
research_graph = workflow.compile()