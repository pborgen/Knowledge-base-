export type EmbeddingProvider = {
  embedMany(texts: string[]): Promise<number[][]>;
  embedOne(text: string): Promise<number[]>;
};

let provider: EmbeddingProvider | null = null;

export function setEmbeddingProvider(p: EmbeddingProvider) {
  provider = p;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!provider) throw new Error("Embedding provider not set");
  return provider;
}
