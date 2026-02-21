import fs from "node:fs";
import path from "node:path";

export type Visibility = "private" | "shared" | "public";

export type User = { email: string; name?: string };
export type Space = { id: string; name: string; ownerEmail: string; visibility: Visibility; memberEmails: string[] };
export type DocumentMeta = { docId: string; source: string; ownerEmail: string; spaceId: string; visibility: Visibility; allowedEmails: string[]; updatedAt: string };

type DB = { users: User[]; spaces: Space[]; documents: DocumentMeta[] };

const dataDir = path.resolve("data");
const dbPath = path.join(dataDir, "store.json");

function load(): DB {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    const init: DB = { users: [], spaces: [], documents: [] };
    fs.writeFileSync(dbPath, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8")) as DB;
}

function save(db: DB) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function id() {
  return Math.random().toString(36).slice(2, 10);
}

export function upsertUser(email: string, name?: string) {
  const db = load();
  const idx = db.users.findIndex((u) => u.email === email);
  if (idx >= 0) db.users[idx] = { ...db.users[idx], name };
  else db.users.push({ email, name });
  save(db);
}

export function ensurePersonalSpace(email: string): Space {
  const db = load();
  const existing = db.spaces.find((s) => s.ownerEmail === email && s.name === "Personal");
  if (existing) return existing;
  const created: Space = { id: id(), name: "Personal", ownerEmail: email, visibility: "private", memberEmails: [] };
  db.spaces.push(created);
  save(db);
  return created;
}

export function listSpacesForUser(email: string): Space[] {
  const db = load();
  return db.spaces.filter((s) => s.ownerEmail === email || s.memberEmails.includes(email) || s.visibility === "public");
}

export function createSpace(ownerEmail: string, name: string, visibility: Visibility = "private"): Space {
  const db = load();
  const space: Space = { id: id(), name, ownerEmail, visibility, memberEmails: [] };
  db.spaces.push(space);
  save(db);
  return space;
}

export function shareSpace(spaceId: string, ownerEmail: string, targetEmail: string): Space {
  const db = load();
  const space = db.spaces.find((s) => s.id === spaceId && s.ownerEmail === ownerEmail);
  if (!space) throw new Error("Space not found or unauthorized");
  if (!space.memberEmails.includes(targetEmail)) space.memberEmails.push(targetEmail);
  if (space.visibility === "private") space.visibility = "shared";
  save(db);
  return space;
}

export function setSpaceVisibility(spaceId: string, ownerEmail: string, visibility: Visibility): Space {
  const db = load();
  const space = db.spaces.find((s) => s.id === spaceId && s.ownerEmail === ownerEmail);
  if (!space) throw new Error("Space not found or unauthorized");
  space.visibility = visibility;
  save(db);
  return space;
}

export function getSpace(spaceId: string): Space | undefined {
  return load().spaces.find((s) => s.id === spaceId);
}

export function canAccessSpace(email: string, space: Space): boolean {
  return space.ownerEmail === email || space.memberEmails.includes(email) || space.visibility === "public";
}

export function upsertDocumentMeta(doc: DocumentMeta) {
  const db = load();
  const idx = db.documents.findIndex((d) => d.docId === doc.docId);
  if (idx >= 0) db.documents[idx] = doc;
  else db.documents.push(doc);
  save(db);
}

export function listDocumentsForUser(email: string, spaceId?: string): DocumentMeta[] {
  const db = load();
  return db.documents.filter((d) => {
    if (spaceId && d.spaceId !== spaceId) return false;
    return d.ownerEmail === email || d.visibility === "public" || d.allowedEmails.includes(email);
  });
}

export function listPublicDocuments(): DocumentMeta[] {
  return load().documents.filter((d) => d.visibility === "public");
}

export function setDocumentVisibility(docId: string, requesterEmail: string, visibility: Visibility): DocumentMeta {
  const db = load();
  const doc = db.documents.find((d) => d.docId === docId);
  if (!doc) throw new Error("Document not found");
  if (doc.ownerEmail !== requesterEmail) throw new Error("Unauthorized");
  doc.visibility = visibility;
  doc.updatedAt = new Date().toISOString();
  save(db);
  return doc;
}
