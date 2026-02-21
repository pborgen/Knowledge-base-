import OpenAI from "openai";
import { config } from "./config.js";

const client = new OpenAI({ apiKey: config.openaiApiKey });

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const resp = await client.embeddings.create({
    model: config.embedModel,
    input: texts
  });
  return resp.data.map((d) => d.embedding);
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embedMany([text]);
  return v;
}
