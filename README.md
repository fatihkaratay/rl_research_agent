## Project Structure

```text
rl_research_agent/
├── .env                 # API Keys and Mongo URI
├── main.py              # FastAPI entry point
├── src/
│   ├── __init__.py
│   ├── database.py      # MongoDB connection & operations
│   ├── schemas.py       # Pydantic models for data validation
│   ├── agent/           # LangGraph workflow
│   │   ├── __init__.py
│   │   ├── graph.py     # The "state machine" definition
│   │   └── nodes.py     # Individual steps (search, translate, etc.)
│   └── tools/           # External API wrappers (ArXiv)
│       ├── __init__.py
│       └── arxiv.py
└── requirements.txt
```
