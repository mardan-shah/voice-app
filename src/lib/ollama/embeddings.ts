const BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

type EmbeddingResponse = {
  embedding?: number[];
  error?: string;
};

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBED_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  if (!data.embedding) {
    throw new Error(data.error ?? "Embedding response did not include a vector.");
  }
  return data.embedding;
}
