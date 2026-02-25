import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHttpApp } from "../src/http-app.js";
import { upsertDocumentMeta } from "../src/store.js";

const dataPath = path.resolve("data/store.json");

function resetData() {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify({ users: [], spaces: [], documents: [] }, null, 2));
}

test("session endpoint requires auth and returns authenticated user", async () => {
  resetData();
  const app = createHttpApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    let res = await fetch(`${base}/api/session`);
    assert.equal(res.status, 401);

    res = await fetch(`${base}/api/session`, { headers: { "x-user-email": "owner@example.com" } });
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.authenticated, true);
    assert.equal(body.email, "owner@example.com");
  } finally {
    server.close();
  }
});

test("spaces, sharing, and document visibility/public library flows", async () => {
  resetData();
  const app = createHttpApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const owner = "owner@example.com";
    const member = "member@example.com";

    let res = await fetch(`${base}/api/spaces`, { headers: { "x-user-email": owner } });
    assert.equal(res.status, 200);
    let body: any = await res.json();
    assert.ok(body.spaces.length >= 1);

    res = await fetch(`${base}/api/spaces`, {
      method: "POST",
      headers: { "x-user-email": owner, "content-type": "application/json" },
      body: JSON.stringify({ name: "Team KB", visibility: "private" })
    });
    body = await res.json();
    const spaceId = body.space.id as string;
    assert.ok(spaceId);

    res = await fetch(`${base}/api/spaces/${spaceId}/share`, {
      method: "POST",
      headers: { "x-user-email": owner, "content-type": "application/json" },
      body: JSON.stringify({ targetEmail: member })
    });
    body = await res.json();
    assert.equal(body.space.visibility, "shared");

    upsertDocumentMeta({
      docId: "doc-1",
      source: "notes.md",
      ownerEmail: owner,
      spaceId,
      visibility: "private",
      allowedEmails: [owner, member],
      updatedAt: new Date().toISOString()
    });

    res = await fetch(`${base}/api/documents?spaceId=${spaceId}`, { headers: { "x-user-email": member } });
    body = await res.json();
    assert.equal(body.documents.length, 1);

    res = await fetch(`${base}/api/documents/doc-1/visibility`, {
      method: "POST",
      headers: { "x-user-email": owner, "content-type": "application/json" },
      body: JSON.stringify({ visibility: "public" })
    });
    body = await res.json();
    assert.equal(body.document.visibility, "public");

    res = await fetch(`${base}/api/public-library`);
    body = await res.json();
    assert.equal(body.documents.length, 1);
    assert.equal(body.documents[0].docId, "doc-1");
  } finally {
    server.close();
  }
});
