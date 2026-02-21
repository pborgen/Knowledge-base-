import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { v4 as uuidv4 } from "uuid";
import { chunkText } from "./chunk.js";
import { embedMany } from "./embed.js";
import { ensureCollection, upsertPoints } from "./qdrant.js";

const SUPPORTED = [".md", ".txt", ".json", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".swift"];

export async function ingestPaths(pathsOrGlobs: string[]) {
  const files = await fg(pathsOrGlobs, { absolute: true, onlyFiles: true });
  const filtered = files.filter((f) => SUPPORTED.includes(path.extname(f).toLowerCase()));

  const batch: { id: string; text: string; payload: Record<string, unknown> }[] = [];

  for (const file of filtered) {
    const content = await fs.readFile(file, "utf8");
    const chunks = chunkText(content);
    chunks.forEach((chunk, idx) => {
      batch.push({
        id: uuidv4(),
        text: chunk,
        payload: {
          source: file,
          chunk_index: idx,
          total_chunks: chunks.length,
          text: chunk
        }
      });
    });
  }

  if (!batch.length) return { files: filtered.length, chunks: 0 };

  const vectors = await embedMany(batch.map((b) => b.text));
  await ensureCollection(vectors[0].length);

  await upsertPoints(
    batch.map((b, i) => ({
      id: b.id,
      vector: vectors[i],
      payload: b.payload
    }))
  );

  return { files: filtered.length, chunks: batch.length };
}
