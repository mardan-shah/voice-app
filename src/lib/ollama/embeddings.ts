function envOrDefault(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function isLocalBaseUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

const BASE_URL = normalizeBaseUrl(
  envOrDefault("OLLAMA_CLOUD_BASE_URL", envOrDefault("OLLAMA_BASE_URL", "https://ollama.com"))
);
const API_KEY = process.env.OLLAMA_CLOUD_API_KEY?.trim() || process.env.OLLAMA_API_KEY?.trim() || "";
const EMBED_MODEL = envOrDefault("OLLAMA_EMBED_MODEL", "nomic-embed-text");

let embeddingsUnavailable = false;

type EmbeddingResponse = {
  embeddings?: number[][];
  embedding?: number[];
  error?: string;
};

function getAuthHeaders(): Record<string, string> {
  if (API_KEY) {
    return { Authorization: `Bearer ${API_KEY}` };
  }

  if (isLocalBaseUrl(BASE_URL)) {
    return {};
  }

  throw new Error("Missing OLLAMA_CLOUD_API_KEY for Ollama Cloud embeddings.");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (embeddingsUnavailable) {
    throw new Error("Embedding endpoint is unavailable.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
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
    embeddingsUnavailable = true;
    throw new Error("Embedding endpoint is unavailable.");
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
  if (embedding.length !== 768) {
    throw new Error(
      `Embedding model ${EMBED_MODEL} returned ${embedding.length} dimensions; the database expects 768.`
    );
  }
  return embedding;
}
