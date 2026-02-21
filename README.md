# Knowledge Base

Personal Knowledge Copilot project (MCP + RAG + mobile UI) lives in:

- `pkc-mcp/`

## Quick start

```bash
cd pkc-mcp
docker compose up -d
cp .env.example .env
# set OPENAI_API_KEY and GOOGLE_CLIENT_ID
npm install
npm run build
npm run dev:http
```

Then open `http://localhost:8787`.
