import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { chunkText } from "./chunk.js";
import { embedMany } from "./embed.js";
import { ensureCollection, upsertPoints, deleteByDocId } from "./qdrant.js";
import type { IngestMetadata } from "./types.js";

const SUPPORTED = [".md", ".txt", ".json", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".swift", ".pdf"];

function hashText(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function upsertDocument(text: string, metadata: IngestMetadata) {
  const chunks = chunkText(text);
  if (!chunks.length) return 0;

  const vectors = await embedMany(chunks);
  await ensureCollection(vectors[0].length);

  await deleteByDocId(metadata.docId);

  await upsertPoints(
    chunks.map((chunk, idx) => ({
      id: hashText(`${metadata.docId}:${idx}`),
      vector: vectors[idx],
      payload: {
        source: metadata.source,
        source_type: metadata.sourceType ?? "file",
        owner: metadata.owner ?? "local",
        tags: metadata.tags ?? [],
        hash: metadata.hash,
        doc_id: metadata.docId,
        chunk_index: idx,
        total_chunks: chunks.length,
        text: chunk
      }
    }))
  );

  return chunks.length;
}

export async function ingestPaths(pathsOrGlobs: string[], owner = "local") {
  const files = await fg(pathsOrGlobs, { absolute: true, onlyFiles: true });
  const filtered = files.filter((f) => SUPPORTED.includes(path.extname(f).toLowerCase()));

  let totalChunks = 0;

  for (const file of filtered) {
    const content = await fs.readFile(file, "utf8");
    const hash = hashText(content);
    const docId = hashText(`file:${file}`);
    totalChunks += await upsertDocument(content, {
      source: file,
      sourceType: "file",
      owner,
      hash,
      docId
    });
  }

  return { files: filtered.length, chunks: totalChunks };
}

export async function ingestRawText(text: string, source: string, owner = "local", sourceType: IngestMetadata["sourceType"] = "text") {
  const hash = hashText(text);
  const docId = hashText(`${sourceType}:${source}`);
  const chunks = await upsertDocument(text, { source, sourceType, owner, hash, docId });
  return { chunks, docId, hash };
}
