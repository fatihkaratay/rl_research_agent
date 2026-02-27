## Project Structure

```text
rl_research_agent/
├── .env                 # API Keys (OpenAI, Gemini, etc.)
├── config.yaml          # Model settings & prompt configurations
├── main.py              # FastAPI Entry point
├── requirements.txt     # Dependencies
├── src/
│   ├── __init__.py
│   ├── agent/           # The "Brain" (LangGraph logic)
│   │   ├── graph.py     # Graph definition
│   │   ├── nodes.py     # Logic for each step (Search, Analyze, etc.)
│   │   └── state.py     # Schema for the data flowing through the graph
│   ├── db/              # Database interaction layers
│   │   ├── mongo_client.py
│   │   └── mssql_client.py
│   └── tools/           # External utility functions (ArXiv API, PDF parser)
│       └── arxiv_search.py
└── frontend/            # React application (we'll do this later)
```
