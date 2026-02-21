import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./config.js";
export const qdrant = new QdrantClient({ url: config.qdrantUrl });
export async function ensureCollection(vectorSize) {
    const existing = await qdrant.getCollections();
    const has = existing.collections.some((c) => c.name === config.collection);
    if (!has) {
        await qdrant.createCollection(config.collection, {
            vectors: { size: vectorSize, distance: "Cosine" }
        });
    }
}
export async function upsertPoints(points) {
    if (!points.length)
        return;
    await qdrant.upsert(config.collection, {
        wait: true,
        points
    });
}
export async function searchByVector(vector, limit = 5) {
    return qdrant.search(config.collection, {
        vector,
        limit,
        with_payload: true,
        with_vector: false
    });
}
