import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./config.js";
import type { SearchFilters } from "./types.js";

export const qdrant = new QdrantClient({ url: config.qdrantUrl });

export async function ensureCollection(vectorSize: number): Promise<void> {
  const existing = await qdrant.getCollections();
  const has = existing.collections.some((c) => c.name === config.collection);
  if (!has) {
    await qdrant.createCollection(config.collection, {
      vectors: { size: vectorSize, distance: "Cosine" }
    });
  }
}

type Point = {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
};

export async function upsertPoints(points: Point[]): Promise<void> {
  if (!points.length) return;
  await qdrant.upsert(config.collection, { wait: true, points });
}

function filterToQdrant(filters?: SearchFilters) {
  const must: any[] = [];
  if (!filters) return undefined;

  if (filters.sourceType) must.push({ key: "source_type", match: { value: filters.sourceType } });
  if (filters.owner) must.push({ key: "owner", match: { value: filters.owner } });
  if (filters.spaceId) must.push({ key: "space_id", match: { value: filters.spaceId } });
  if (filters.tags?.length) must.push(...filters.tags.map((t) => ({ key: "tags", match: { value: t } })));

  if (filters.requesterEmail) {
    must.push({
      filter: {
        should: [
          { key: "owner", match: { value: filters.requesterEmail } },
          { key: "visibility", match: { value: "public" } },
          { key: "allowed_emails", match: { value: filters.requesterEmail } }
        ]
      }
    });
  }

  return must.length ? { must } : undefined;
}

export async function searchByVector(vector: number[], limit = 10, filters?: SearchFilters) {
  return qdrant.search(config.collection, {
    vector,
    limit,
    filter: filterToQdrant(filters),
    with_payload: true,
    with_vector: false
  });
}

export async function deleteByDocId(docId: string): Promise<void> {
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
