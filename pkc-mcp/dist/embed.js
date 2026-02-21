import OpenAI from "openai";
import { config } from "./config.js";
const client = new OpenAI({ apiKey: config.openaiApiKey });
export async function embedMany(texts) {
    if (!texts.length)
        return [];
    const resp = await client.embeddings.create({
        model: config.embedModel,
        input: texts
    });
    return resp.data.map((d) => d.embedding);
}
export async function embedOne(text) {
    const [v] = await embedMany([text]);
    return v;
}
