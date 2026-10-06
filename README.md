# Sandboxed Agent Engine

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-ReAct%20Agent-FF6F00)](https://langchain-ai.github.io/langgraph/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.3+-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade autonomous AI agent engine featuring secure sandboxed code execution, dynamic skill acquisition, Model Context Protocol (MCP) integrations, multi-modal document understanding, and a decoupled turn lifecycle.

---

## Architecture Overview

```mermaid
graph TD
    subgraph Client ["Client Layer"]
        UI["React 18 + Vite Frontend\n(SSE Streaming & Real-Time Timeline)"]
        VOICE["Audio WebSocket Client\n(Voice & Dictation Mode)"]
    end

    subgraph API ["Gateway & Controllers"]
        FASTAPI["FastAPI Engine\n(CORS · Rate-Limiter · JWT Auth · Structlog)"]
        WS["WebSocket Handlers\n(Bidirectional Audio Streams)"]
    end

    subgraph AgentCore ["Agentic Core (LangGraph)"]
        REAC["Single ReAct Agent Graph\n(agent_node ⇄ agent_tool_node)"]
        TM["Turn Manager\n(HTTP-Decoupled Asynchronous Turn Loop)"]
        MEM["Memory Bank & Context Compactor\n(Durable Facts + Cross-Turn Summarization)"]
    end

    subgraph Execution ["Sandboxed Execution"]
        HOOKS["Pre-Tool Guardrails & Validation"]
        LOCAL["Local Subprocess Engine"]
        REMOTE["gVisor Container Sandbox (SES)"]
    end

    subgraph Data ["Data & Storage"]
        MONGO[("MongoDB Atlas\nUsers · Conversations · Events")]
        QDRANT[("Qdrant Vector DB\nHybrid Semantic Retrieval")]
        REDIS[("Redis\nCheckpointer · Cache · Job Queue")]
    end

    subgraph External ["Tools & Microservices"]
        MCP["MCP Server Protocol\n(Google Drive, Filesystem, Custom)"]
        PARSER["PDF Region Parser Service\n(DocLayout-YOLO + Vision Model)"]
        VOICE_MODELS["Voice Services\n(Sarvam · Deepgram · Cartesia)"]
        OMNI["OmniRoute / LLM Gateway\n(Google Gemini Models)"]
    end

    UI --> FASTAPI
    VOICE --> WS
    FASTAPI --> TM
    WS --> VOICE_MODELS
    TM --> REAC
    REAC --> Execution
    REAC --> MCP
    REAC --> PARSER
    REAC --> OMNI
    REAC --> MEM
    TM --> MONGO
    REAC --> QDRANT
    REAC --> REDIS
```

---

## Core Features

- **Isolated Sandboxed Execution:** Supports local isolated execution and remote gVisor container runtimes (`SANDBOX_EXECUTOR_MODE=remote`) to execute untrusted Python and shell commands safely.
- **Decoupled Turn Lifecycle:** LLM reasoning and execution loops run asynchronously in background tasks managed by `TurnManager`. Closing the browser does not terminate agent turns; returning re-attaches to the live stream.
- **Dynamic Skills Vault:** Built-in and dynamically loadable skills with YAML frontmatter triggers (e.g. `create-pdf`, `spreadsheet-analyst`, `web-artifacts-builder`, `algorithmic-art`).
- **Model Context Protocol (MCP):** Connect external data stores and enterprise tools (Google Drive, filesystem, API servers) via SSE/stdio transport with automated OAuth 2.1 PKCE discovery.
- **Context Compaction & Memory:** Automatic background durable fact extraction and cross-turn summary compaction to maintain long-horizon coherence without context window overflow.
- **Agentic RAG & Document Parsing:** Hybrid semantic search with Qdrant alongside a dedicated microservice using DocLayout-YOLO for vision-based layout-preserving OCR.
- **Full-Duplex Voice Interaction:** Streaming voice pipeline supporting Indian and English language models with sub-second turnaround.

---

## Repository Structure

```
Sandboxed-agent-engine/
├── backend/
│   ├── config/              # LLM models and RAG configuration
│   ├── controllers/         # API controllers
│   ├── core/                # DB, auth, cache, limiter, logging middleware
│   ├── deploy/              # Nginx reverse proxy and deployment configs
│   ├── graph/               # LangGraph ReAct engine, nodes, and state definitions
│   ├── models/              # Pydantic schemas and database models
│   ├── pdf-parser/          # Standalone DocLayout-YOLO PDF parser microservice
│   ├── rag/                 # Vector ingestion, chunking, and hybrid retrieval
│   ├── routes/              # FastAPI route endpoints
│   ├── services/            # Chat, history, memory, turn management services
│   ├── skills/              # Built-in skills library and loader
│   ├── tests/               # Test suites (unit, regression, and e2e)
│   ├── tools/               # REPL, shell, search, and document creation tools
│   ├── utils/               # Code executor, sandbox client, guardrail hooks
│   ├── voice/               # Real-time STT/TTS audio streaming pipeline
│   ├── Dockerfile           # Backend container definition
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── public/              # Static assets and icons
│   ├── src/
│   │   ├── components/      # React components (chat, auth, mcp, layout, arch)
│   │   ├── context/         # Auth, chat, and theme providers
│   │   ├── pages/           # Application views and dashboards
│   │   ├── services/        # API client and WebSocket streaming wrappers
│   │   └── App.jsx          # Root application and route definitions
│   ├── package.json         # Frontend dependencies and scripts
│   └── vite.config.js       # Vite build configuration
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- MongoDB Atlas or local MongoDB instance
- Redis instance
- Qdrant Vector Database

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy environment configuration and update keys:
   ```bash
   cp .env.sample .env
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing

Run the automated test suite in the backend:
```bash
cd backend
python -m pytest -q --ignore=tests/test_integration_live.py
```

---

## License

This project is licensed under the MIT License.
