import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { chunkText } from "./chunk.js";
import { getEmbeddingProvider } from "./embedding-provider.js";
import { getVectorStore } from "./vector-store.js";
const SUPPORTED = [".md", ".txt", ".json", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".swift", ".pdf"];
function hashText(input) {
    return crypto.createHash("sha256").update(input).digest("hex");
}
async function upsertDocument(text, metadata) {
    const chunks = chunkText(text);
    if (!chunks.length)
        return 0;
    const vectors = await getEmbeddingProvider().embedMany(chunks);
    const store = getVectorStore();
    await store.ensureCollection(vectors[0].length);
    await store.deleteByDocId(metadata.docId);
    await store.upsertPoints(chunks.map((chunk, idx) => ({
        id: hashText(`${metadata.docId}:${idx}`),
        vector: vectors[idx],
        payload: {
            source: metadata.source,
            source_type: metadata.sourceType ?? "file",
            owner: metadata.owner ?? "local",
            space_id: metadata.spaceId ?? "default",
            visibility: metadata.visibility ?? "private",
            allowed_emails: metadata.allowedEmails ?? [],
            tags: metadata.tags ?? [],
            hash: metadata.hash,
            doc_id: metadata.docId,
            chunk_index: idx,
            total_chunks: chunks.length,
            text: chunk
        }
    })));
    return chunks.length;
}
export async function ingestPaths(pathsOrGlobs, owner = "local") {
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
export async function ingestRawText(text, source, owner = "local", sourceType = "text", spaceId = "default", visibility = "private", allowedEmails = []) {
    const hash = hashText(text);
    const docId = hashText(`${sourceType}:${source}:${spaceId}`);
    const chunks = await upsertDocument(text, { source, sourceType, owner, hash, docId, spaceId, visibility, allowedEmails });
    return { chunks, docId, hash };
}
