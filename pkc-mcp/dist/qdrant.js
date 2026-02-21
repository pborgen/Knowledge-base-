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
    await qdrant.upsert(config.collection, { wait: true, points });
}
function filterToQdrant(filters) {
    const must = [];
    if (!filters)
        return undefined;
    if (filters.sourceType) {
        must.push({ key: "source_type", match: { value: filters.sourceType } });
    }
    if (filters.owner) {
        must.push({ key: "owner", match: { value: filters.owner } });
    }
    if (filters.tags?.length) {
        must.push(...filters.tags.map((t) => ({ key: "tags", match: { value: t } })));
    }
    return must.length ? { must } : undefined;
}
export async function searchByVector(vector, limit = 10, filters) {
    return qdrant.search(config.collection, {
        vector,
        limit,
        filter: filterToQdrant(filters),
        with_payload: true,
        with_vector: false
    });
}
export async function deleteByDocId(docId) {
    await qdrant.delete(config.collection, {
        wait: true,
        filter: { must: [{ key: "doc_id", match: { value: docId } }] }
    });
}
export async function scrollAll(limit = 200) {
    return qdrant.scroll(config.collection, {
        limit,
        with_payload: true,
        with_vector: false
    });
}
