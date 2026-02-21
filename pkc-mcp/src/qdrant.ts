import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./config.js";

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
  await qdrant.upsert(config.collection, {
    wait: true,
    points
  });
}

export async function searchByVector(vector: number[], limit = 5) {
  return qdrant.search(config.collection, {
    vector,
    limit,
    with_payload: true,
    with_vector: false
  });
}
