function envOrDefault(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

const FIELDWAVES_URL = envOrDefault("FIELDWAVES_API_URL", "https://ai.fieldwaves.com/api/generate");
const USERNAME = envOrDefault("FIELDWAVES_USERNAME", "mardan");
const PASSWORD = process.env.FIELDWAVES_PASSWORD ?? "";
const EMBED_MODEL = envOrDefault(
  "FIELDWAVES_EMBED_MODEL",
  envOrDefault("OLLAMA_EMBED_MODEL", "nomic-embed-text")
);

// Derive embeddings endpoint from the configured generation endpoint.
const BASE_URL = FIELDWAVES_URL.replace(/\/api\/generate\/?$/, "");
let embeddingsUnavailable = false;

type EmbeddingResponse = {
  embeddings?: number[][];
  embedding?: number[];
  error?: string;
};

export async function generateEmbedding(text: string): Promise<number[]> {
  if (embeddingsUnavailable) {
    throw new Error("Embedding endpoint is unavailable.");
  }

  const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Basic ${auth}`,
  };

  const response = await fetch(`${BASE_URL}/api/embed`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text,
    }),
  });

  if (response.status === 404) {
    const legacyResponse = await fetch(`${BASE_URL}/api/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: EMBED_MODEL,
        prompt: text,
      }),
    });

    if (legacyResponse.status === 404) {
      embeddingsUnavailable = true;
      throw new Error("Embedding endpoint is unavailable.");
    }

    if (!legacyResponse.ok) {
      const errorText = await legacyResponse.text();
      throw new Error(`Embedding request failed: ${legacyResponse.status} ${errorText}`);
    }

    const legacyData = (await legacyResponse.json()) as EmbeddingResponse;
    const legacyEmbedding = legacyData.embedding ?? legacyData.embeddings?.[0];
    if (!legacyEmbedding) {
      throw new Error(legacyData.error ?? "Embedding response did not include a vector.");
    }
    return legacyEmbedding;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  const embedding = data.embeddings?.[0] ?? data.embedding;
  if (!embedding) {
    throw new Error(data.error ?? "Embedding response did not include a vector.");
  }
  return embedding;
}
