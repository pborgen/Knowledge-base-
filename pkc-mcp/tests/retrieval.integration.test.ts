import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHttpApp } from "../src/http-app.js";
import { setEmbeddingProvider } from "../src/embedding-provider.js";
import { setVectorStore } from "../src/vector-store.js";

type P = { id: string; vector: number[]; payload: Record<string, unknown> };
const points: P[] = [];

function resetData() {
  const dataPath = path.resolve("data/store.json");
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify({ users: [], spaces: [], documents: [] }, null, 2));
  points.length = 0;
}

setEmbeddingProvider({
  async embedMany(texts: string[]) {
    return texts.map((t) => [t.length, t.split(" ").length, 1]);
  },
  async embedOne(text: string) {
    return [text.length, text.split(" ").length, 1];
  }
});

setVectorStore({
  async ensureCollection() {},
  async upsertPoints(ps) {
    points.push(...(ps as P[]));
  },
  async deleteByDocId(docId: string) {
    for (let i = points.length - 1; i >= 0; i--) {
      if (points[i].payload.doc_id === docId) points.splice(i, 1);
    }
  },
  async searchByVector(_vector, limit = 10, filters) {
    const filtered = points.filter((p) => {
      const payload = p.payload as any;
      if (filters?.spaceId && payload.space_id !== filters.spaceId) return false;
      if (filters?.requesterEmail) {
        const allowed = payload.owner === filters.requesterEmail || payload.visibility === "public" || (payload.allowed_emails || []).includes(filters.requesterEmail);
        if (!allowed) return false;
      }
      return true;
    });
    return filtered.slice(0, limit).map((p) => ({ score: 0.9, payload: p.payload }));
  }
});

test("ingest + answer integration with mocked providers", async () => {
  resetData();
  const app = createHttpApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const owner = "owner@example.com";
    let res = await fetch(`${base}/api/spaces`, { headers: { "x-user-email": owner } });
    let body: any = await res.json();
    const personal = body.spaces[0];

    const form = new FormData();
    form.append("file", new Blob(["alpha beta gamma knowledge content"], { type: "text/plain" }), "note.txt");
    form.append("spaceId", personal.id);

    res = await fetch(`${base}/api/ingest/upload`, {
      method: "POST",
      headers: { "x-user-email": owner },
      body: form
    });
    body = await res.json();
    assert.equal(body.ok, true);

    res = await fetch(`${base}/api/answer`, {
      method: "POST",
      headers: { "x-user-email": owner, "content-type": "application/json" },
      body: JSON.stringify({ question: "what content?", filters: { spaceId: personal.id } })
    });
    body = await res.json();
    assert.equal(body.ok, true);
    assert.match(body.answer, /Top matches/);
    assert.match(body.answer, /note\.txt/);
  } finally {
    server.close();
  }
});
