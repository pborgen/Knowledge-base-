import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  openaiApiKey: required("OPENAI_API_KEY"),
  qdrantUrl: process.env.QDRANT_URL ?? "http://localhost:6333",
  collection: process.env.QDRANT_COLLECTION ?? "personal_knowledge",
  embedModel: process.env.EMBED_MODEL ?? "text-embedding-3-large"
};
