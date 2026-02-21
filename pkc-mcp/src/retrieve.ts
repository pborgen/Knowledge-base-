import { getEmbeddingProvider } from "./embedding-provider.js";
import { getVectorStore } from "./vector-store.js";
import type { SearchFilters } from "./types.js";

function lexicalScore(text: string, query: string): number {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!q.length) return 0;
  const t = text.toLowerCase();
  let hits = 0;
  for (const term of q) {
    if (t.includes(term)) hits++;
  }
  return hits / q.length;
}

export async function retrieve(query: string, topK = 5, filters?: SearchFilters) {
  const vector = await getEmbeddingProvider().embedOne(query);
  const denseHits = await getVectorStore().searchByVector(vector, Math.max(topK * 4, 20), filters);

  const reranked = denseHits
    .map((h) => {
      const text = (h.payload?.text as string) ?? "";
      const dense = h.score ?? 0;
      const lex = lexicalScore(text, query);
      const hybrid = dense * 0.7 + lex * 0.3;
      return {
        score: hybrid,
        dense_score: dense,
        lexical_score: lex,
        source: (h.payload?.source as string) ?? "unknown",
        source_type: (h.payload?.source_type as string) ?? "unknown",
        chunk_index: (h.payload?.chunk_index as number) ?? -1,
        text
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return reranked;
}

export async function answerWithCitations(question: string, topK = 5, filters?: SearchFilters): Promise<string> {
  const results = await retrieve(question, topK, filters);
  if (!results.length) return "No relevant context found.";

  const summary = results
    .map(
      (r, i) =>
        `[#${i + 1}] ${r.source} (${r.source_type}, chunk ${r.chunk_index}, hybrid ${r.score.toFixed(3)})\n${r.text.slice(0, 500)}`
    )
    .join("\n\n");

  return `Top matches for: \"${question}\"\n\n${summary}`;
}
