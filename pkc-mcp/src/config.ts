import dotenv from "dotenv";

dotenv.config();

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  qdrantUrl: process.env.QDRANT_URL ?? "http://localhost:6333",
  collection: process.env.QDRANT_COLLECTION ?? "personal_knowledge",
  embedModel: process.env.EMBED_MODEL ?? "text-embedding-3-large",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  appPort: Number(process.env.APP_PORT ?? 8787),
  allowDevAuthHeaders: process.env.ALLOW_DEV_AUTH_HEADERS !== "false"
};
