# Sandboxed Agent Engine — Frontend

React 18 + Vite chat UI for Sandboxed Agent Engine — an agentic AI workspace (sandboxed Python/shell execution,
document generation, RAG, vision, MCP tool integrations), not just a chat wrapper around an LLM.

## Features

- 🔐 Cookie-based JWT authentication (signup/login)
- 💬 Streaming chat over SSE, with a chronological agent timeline (narration text interleaved with
  tool calls, live terminal output, skill loads, and generated-file cards)
- 🔄 **Resumable generation** — reloading mid-response reattaches to the still-running turn and
  replays what you missed instead of losing it (backend: `services/turn_manager.py`)
- 🧮 Rendered LaTeX (KaTeX) and full light/dark theming, including in markdown output
- 🛠️ MCP tools integration + native tool toggles
- 📋 Conversation history management

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` (Vite's default) and expects the backend at the URL
in `VITE_API_URL` (see `src/config.js`), defaulting to `http://localhost:8000`.

### 3. Build for Production

```bash
npm run build
```

No test/lint script is currently configured in `package.json`.

## Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication pages
│   ├── chat/           # Chat interface (ChatPage, ChatWindow, Message, MessageInput, ConversationSidebar)
│   ├── home/            # Pre-login landing page
│   ├── settings/        # Model/tools/MCP settings panel
│   ├── mcp/             # MCP tools panel
│   └── shared/          # Reusable components
├── context/             # ChatContext, AuthContext, ThemeContext (global state via Context API, no Redux)
├── services/             # Thin Axios/fetch wrappers per API domain (chat.js, auth.js, rag.js, ...)
├── App.jsx               # Main app with routing
└── main.jsx               # Entry point
```

## Tech Stack

- **React 18** — UI library, with `React.memo` + `useCallback` used deliberately on the chat
  components (`Message`, `MessageInput`, `ConversationSidebar`, `ChatWindow`) to avoid re-rendering
  the whole message list on every streamed token
- **Vite** — build tool
- **Tailwind CSS** (+ `@tailwindcss/typography`, `dark:prose-invert` for themed markdown) — styling
- **react-markdown** + `remark-gfm` + `remark-math`/`rehype-katex` — markdown + LaTeX rendering
- **React Router** — navigation
- **Axios** — HTTP client (SSE streaming itself uses raw `fetch` + a `ReadableStream` reader, see
  `services/chat.js`)

## Usage

1. **Signup**: Create a new account
2. **Login**: Sign in with your credentials
3. **Chat**: Send a message — the agent can run code, generate files (PDF/DOCX/PPTX/XLSX), search
   the web, use RAG over uploaded documents, and call connected MCP tools
4. **Conversations**: View and manage chat history; reload mid-generation without losing it
5. **MCP Tools**: View/connect available tools in the sidebar or settings panel
