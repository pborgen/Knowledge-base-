# Personal Knowledge Copilot (MCP + RAG)

MVP MCP server backed by Qdrant vector DB.

## Features
- Ingest local files into vector store
- Semantic search
- Citation-style answer output
- MCP tools: `ingest_documents`, `search_knowledge`, `answer_with_citations`

## Quick start

1. Start Qdrant:

```bash
docker compose up -d
```

2. Install deps:

```bash
npm install
```

3. Configure env:

```bash
cp .env.example .env
# set OPENAI_API_KEY
```

4. Ingest files:

```bash
npm run ingest -- "../**/*.md"
```

5. Run MCP server (stdio):

```bash
npm run dev
```

## MCP client config (example)
Point your MCP client command to:

```bash
node /absolute/path/to/pkc-mcp/dist/server.js
```

(or use tsx in dev)

## Notes
- Current chunking is character-based (simple, fast for MVP).
- Supported file types: .md, .txt, .json, .ts, .tsx, .js, .jsx, .py, .go, .java, .swift
- Next upgrade: hybrid retrieval + reranking + metadata filters.
