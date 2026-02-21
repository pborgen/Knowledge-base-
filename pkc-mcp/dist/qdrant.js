import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./config.js";
import { setVectorStore } from "./vector-store.js";
export const qdrant = new QdrantClient({ url: config.qdrantUrl, checkCompatibility: false });
function filterToQdrant(filters) {
    const must = [];
    const should = [];
    if (!filters)
        return undefined;
    if (filters.sourceType)
        must.push({ key: "source_type", match: { value: filters.sourceType } });
    if (filters.owner)
        must.push({ key: "owner", match: { value: filters.owner } });
    if (filters.spaceId)
        must.push({ key: "space_id", match: { value: filters.spaceId } });
    if (filters.tags?.length)
        must.push(...filters.tags.map((t) => ({ key: "tags", match: { value: t } })));
    if (filters.requesterEmail) {
        should.push({ key: "owner", match: { value: filters.requesterEmail } }, { key: "visibility", match: { value: "public" } }, { key: "allowed_emails", match: { value: filters.requesterEmail } });
    }
    if (!must.length && !should.length)
        return undefined;
    return should.length ? { must, should } : { must };
}
async function ensureCollection(vectorSize) {
    const existing = await qdrant.getCollections();
    const has = existing.collections.some((c) => c.name === config.collection);
    if (!has) {
        await qdrant.createCollection(config.collection, {
            vectors: { size: vectorSize, distance: "Cosine" }
        });
    }
}
async function upsertPoints(points) {
    if (!points.length)
        return;
    await qdrant.upsert(config.collection, { wait: true, points });
}
async function searchByVector(vector, limit = 10, filters) {
    return qdrant.search(config.collection, {
        vector,
        limit,
        filter: filterToQdrant(filters),
        with_payload: true,
        with_vector: false
    });
}
async function deleteByDocId(docId) {
    await qdrant.delete(config.collection, {
        wait: true,
        filter: { must: [{ key: "doc_id", match: { value: docId } }] }
    });
}
setVectorStore({ ensureCollection, upsertPoints, searchByVector, deleteByDocId });
export { ensureCollection, upsertPoints, searchByVector, deleteByDocId };
