import path from "node:path";
import fs from "node:fs/promises";
import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "./config.js";
import { retrieve, answerWithCitations } from "./retrieve.js";
import { ingestRawText } from "./ingest.js";
import { verifyGoogleIdToken, fetchGoogleDocText, extractGoogleDocId } from "./google.js";

const app = express();
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.resolve("public")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/ingest/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const text = req.file.buffer.toString("utf8");
    const owner = (req.body.owner as string) || "local";
    const result = await ingestRawText(text, req.file.originalname, owner, "file");
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/ingest/google-doc", async (req, res) => {
  try {
    const { idToken, accessToken, docUrl } = req.body as { idToken: string; accessToken: string; docUrl: string };
    if (!idToken || !accessToken || !docUrl) return res.status(400).json({ error: "idToken, accessToken, docUrl required" });

    const user = await verifyGoogleIdToken(idToken);
    const docId = extractGoogleDocId(docUrl);
    const text = await fetchGoogleDocText(accessToken, docId);
    const result = await ingestRawText(text, `google-doc:${docId}`, user.email, "google_doc");
    res.json({ ok: true, user, ...result });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/search", async (req, res) => {
  try {
    const { query, topK = 8, filters } = req.body as { query: string; topK?: number; filters?: any };
    const results = await retrieve(query, topK, filters);
    res.json({ ok: true, results });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/answer", async (req, res) => {
  try {
    const { question, topK = 8, filters } = req.body as { question: string; topK?: number; filters?: any };
    const text = await answerWithCitations(question, topK, filters);
    res.json({ ok: true, answer: text });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("*", async (_req, res) => {
  const html = await fs.readFile(path.resolve("public/index.html"), "utf8");
  res.type("html").send(html);
});

app.listen(config.appPort, () => {
  console.log(`HTTP app running on http://localhost:${config.appPort}`);
});
