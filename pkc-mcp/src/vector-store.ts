import type { SearchFilters } from "./types.js";

export type VectorHit = { score?: number; payload?: Record<string, unknown> | null };

export type VectorStore = {
  ensureCollection(vectorSize: number): Promise<void>;
  upsertPoints(points: { id: string; vector: number[]; payload: Record<string, unknown> }[]): Promise<void>;
  searchByVector(vector: number[], limit?: number, filters?: SearchFilters): Promise<VectorHit[]>;
  deleteByDocId(docId: string): Promise<void>;
};

let store: VectorStore | null = null;

export function setVectorStore(v: VectorStore) {
  store = v;
}

export function getVectorStore(): VectorStore {
  if (!store) throw new Error("Vector store not set");
  return store;
}
