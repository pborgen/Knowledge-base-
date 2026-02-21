import "./embed.js";
import "./qdrant.js";
import path from "node:path";
import fs from "node:fs/promises";
import express from "express";
import cors from "cors";
import multer from "multer";
import { retrieve, answerWithCitations } from "./retrieve.js";
import { ingestRawText } from "./ingest.js";
import { verifyGoogleIdToken, fetchGoogleDocText, extractGoogleDocId } from "./google.js";
import {
  upsertUser,
  ensurePersonalSpace,
  listSpacesForUser,
  createSpace,
  shareSpace,
  setSpaceVisibility,
  getSpace,
  canAccessSpace,
  upsertDocumentMeta,
  listDocumentsForUser,
  listPublicDocuments,
  setDocumentVisibility,
  type Visibility
} from "./store.js";

type AuthedReq = express.Request & { userEmail?: string; userName?: string };

export function createHttpApp() {
  const app = express();
  const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } });

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.static(path.resolve("public")));

  async function auth(req: AuthedReq, _res: express.Response, next: express.NextFunction) {
    try {
      const emailHeader = req.header("x-user-email");
      if (emailHeader) {
        req.userEmail = emailHeader;
        req.userName = emailHeader;
        upsertUser(emailHeader, emailHeader);
        ensurePersonalSpace(emailHeader);
        return next();
      }

      const authz = req.header("authorization") || "";
      if (authz.startsWith("Bearer ")) {
        const idToken = authz.replace("Bearer ", "");
        const user = await verifyGoogleIdToken(idToken);
        req.userEmail = user.email;
        req.userName = user.name;
        upsertUser(user.email, user.name);
        ensurePersonalSpace(user.email);
      }
      next();
    } catch {
      next();
    }
  }

  app.use(auth);
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/spaces", (req: AuthedReq, res) => {
    if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
    res.json({ ok: true, spaces: listSpacesForUser(req.userEmail) });
  });
  app.post("/api/spaces", (req: AuthedReq, res) => {
    if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
    const { name, visibility = "private" } = req.body as { name: string; visibility?: Visibility };
    res.json({ ok: true, space: createSpace(req.userEmail, name, visibility) });
  });
  app.post("/api/spaces/:id/share", (req: AuthedReq, res) => {
    if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
    const { targetEmail } = req.body as { targetEmail: string };
    res.json({ ok: true, space: shareSpace(req.params.id, req.userEmail, targetEmail) });
  });
  app.post("/api/spaces/:id/visibility", (req: AuthedReq, res) => {
    if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
    const { visibility } = req.body as { visibility: Visibility };
    res.json({ ok: true, space: setSpaceVisibility(req.params.id, req.userEmail, visibility) });
  });

  app.post("/api/ingest/upload", upload.single("file"), async (req: AuthedReq, res) => {
    try {
      if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const text = req.file.buffer.toString("utf8");
      const spaceId = (req.body.spaceId as string) || ensurePersonalSpace(req.userEmail).id;
      const space = getSpace(spaceId);
      if (!space || !canAccessSpace(req.userEmail, space)) return res.status(403).json({ error: "Space access denied" });

      const result = await ingestRawText(text, req.file.originalname, req.userEmail, "file", space.id, space.visibility, [space.ownerEmail, ...space.memberEmails]);
      upsertDocumentMeta({ docId: result.docId, source: req.file.originalname, ownerEmail: req.userEmail, spaceId: space.id, visibility: space.visibility, allowedEmails: [space.ownerEmail, ...space.memberEmails], updatedAt: new Date().toISOString() });
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("/api/documents", (req: AuthedReq, res) => {
    if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
    const spaceId = (req.query.spaceId as string | undefined) || undefined;
    res.json({ ok: true, documents: listDocumentsForUser(req.userEmail, spaceId) });
  });
  app.get("/api/public-library", (_req: AuthedReq, res) => {
    res.json({ ok: true, documents: listPublicDocuments() });
  });
  app.post("/api/documents/:docId/visibility", (req: AuthedReq, res) => {
    if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
    const { visibility } = req.body as { visibility: Visibility };
    const doc = setDocumentVisibility(req.params.docId, req.userEmail, visibility);
    res.json({ ok: true, document: doc });
  });

  app.post("/api/ingest/google-doc", async (req: AuthedReq, res) => {
    try {
      if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
      const { idToken, accessToken, docUrl, spaceId } = req.body as { idToken: string; accessToken: string; docUrl: string; spaceId?: string };
      if (!idToken || !accessToken || !docUrl) return res.status(400).json({ error: "idToken, accessToken, docUrl required" });
      const user = await verifyGoogleIdToken(idToken);
      const targetSpaceId = spaceId || ensurePersonalSpace(req.userEmail).id;
      const space = getSpace(targetSpaceId);
      if (!space || !canAccessSpace(req.userEmail, space)) return res.status(403).json({ error: "Space access denied" });
      const docId = extractGoogleDocId(docUrl);
      const text = await fetchGoogleDocText(accessToken, docId);
      const result = await ingestRawText(text, `google-doc:${docId}`, user.email, "google_doc", space.id, space.visibility, [space.ownerEmail, ...space.memberEmails]);
      upsertDocumentMeta({ docId: result.docId, source: `google-doc:${docId}`, ownerEmail: req.userEmail, spaceId: space.id, visibility: space.visibility, allowedEmails: [space.ownerEmail, ...space.memberEmails], updatedAt: new Date().toISOString() });
      res.json({ ok: true, user, ...result });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/api/search", async (req: AuthedReq, res) => {
    try {
      if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
      const { query, topK = 8, filters } = req.body as { query: string; topK?: number; filters?: any };
      const results = await retrieve(query, topK, { ...(filters ?? {}), requesterEmail: req.userEmail });
      res.json({ ok: true, results });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });
  app.post("/api/answer", async (req: AuthedReq, res) => {
    try {
      if (!req.userEmail) return res.status(401).json({ error: "Unauthorized" });
      const { question, topK = 8, filters } = req.body as { question: string; topK?: number; filters?: any };
      const text = await answerWithCitations(question, topK, { ...(filters ?? {}), requesterEmail: req.userEmail });
      res.json({ ok: true, answer: text });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("*", async (_req, res) => {
    const html = await fs.readFile(path.resolve("public/index.html"), "utf8");
    res.type("html").send(html);
  });

  return app;
}
