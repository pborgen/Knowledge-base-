# Personal Knowledge Copilot (MCP + RAG + Mobile UI)

Now includes:
- MCP server tools (`ingest_documents`, `search_knowledge`, `answer_with_citations`)
- HTTP API + mobile-friendly web UI (great on iPhone Safari)
- Google Sign-In + Google Docs ingestion
- File upload ingestion
- Metadata filters (`sourceType`, `owner`, `tags`)
- Hybrid retrieval + reranking (dense + lexical)
- Document dedupe/update by deterministic `doc_id` and hash

## Quick start

```bash
cd /root/.openclaw/workspace/pkc-mcp
docker compose up -d
cp .env.example .env
# set OPENAI_API_KEY and GOOGLE_CLIENT_ID
npm install
npm run build
```

## Run MCP server

```bash
npm run dev
```

## Run HTTP app + UI

```bash
npm run dev:http
# open http://localhost:8787
```

## iPhone workflow

1. Open `http://<your-host-ip>:8787` from iPhone on same network
2. Upload docs directly from Files app (Upload section)
3. Paste Google Doc URL and tap Sign in
4. Ask questions in the query box

## API endpoints

- `POST /api/ingest/upload` (multipart `file`)
- `POST /api/ingest/google-doc` (`idToken`, `accessToken`, `docUrl`)
- `POST /api/search` (`query`, `topK`, `filters`)
- `POST /api/answer` (`question`, `topK`, `filters`)

## Notes
- For production, add persistent auth/session storage and HTTPS.
- PDF text extraction is currently naive (plain text read). Use a parser before production.
