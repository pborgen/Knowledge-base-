import { embedOne } from "./embed.js";
import { searchByVector } from "./qdrant.js";
export async function retrieve(query, topK = 5) {
    const vector = await embedOne(query);
    const hits = await searchByVector(vector, topK);
    return hits.map((h) => ({
        score: h.score,
        source: h.payload?.source ?? "unknown",
        chunk_index: h.payload?.chunk_index ?? -1,
        text: h.payload?.text ?? ""
    }));
}
export async function answerWithCitations(question, topK = 5) {
    const results = await retrieve(question, topK);
    if (!results.length)
        return "No relevant context found.";
    const summary = results
        .map((r, i) => `[#${i + 1}] ${r.source} (chunk ${r.chunk_index}, score ${r.score.toFixed(3)})\n${r.text.slice(0, 400)}`)
        .join("\n\n");
    return `Top matches for: \"${question}\"\n\n${summary}`;
}
