const FIELDWAVES_URL = process.env.FIELDWAVES_API_URL ?? "https://ai.fieldwaves.com/api/generate";
const USERNAME = process.env.FIELDWAVES_USERNAME ?? "mardan";
const PASSWORD = process.env.FIELDWAVES_PASSWORD ?? "";
const EMBED_MODEL =
  process.env.FIELDWAVES_EMBED_MODEL ?? process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

// Derive embeddings endpoint from generate endpoint
const BASE_URL = FIELDWAVES_URL.replace("/api/generate", "");

type EmbeddingResponse = {
  embeddings?: number[][];
  error?: string;
};

export async function generateEmbedding(text: string): Promise<number[]> {
  const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");

  const response = await fetch(`${BASE_URL}/api/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  const embedding = data.embeddings?.[0];
  if (!embedding) {
    throw new Error(data.error ?? "Embedding response did not include a vector.");
  }
  return embedding;
}
