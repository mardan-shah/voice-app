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
const MODEL = envOrDefault("OLLAMA_CHAT_MODEL", envOrDefault("OLLAMA_MODEL", "gemma4:31b"));

type OllamaStreamResponse = {
  response?: string;
  message?: {
    content?: string;
  };
  choices?: {
    delta?: {
      content?: string;
    };
    message?: {
      content?: string;
    };
  }[];
  done?: boolean;
  error?: string;
};

function getAuthHeaders(): Record<string, string> {
  if (API_KEY) {
    return { Authorization: `Bearer ${API_KEY}` };
  }

  if (isLocalBaseUrl(BASE_URL)) {
    return {};
  }

  throw new Error("Missing OLLAMA_CLOUD_API_KEY for Ollama Cloud.");
}

function parseChunk(line: string) {
  const trimmed = line.trim();
  const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
  if (!payload || payload === "[DONE]") {
    return "";
  }

  const data = JSON.parse(payload) as OllamaStreamResponse;
  if (data.error) {
    throw new Error(data.error);
  }
  return (
    data.response ??
    data.message?.content ??
    data.choices?.[0]?.delta?.content ??
    data.choices?.[0]?.message?.content ??
    ""
  );
}

/**
 * Chat with Ollama Cloud or an explicitly configured Ollama-compatible host.
 */
export async function chatWithOllama(
  messages: { role: string; content: string }[],
  onToken?: (token: string) => void
): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 320,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama chat failed: ${response.status} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("Ollama chat returned an empty response stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      const token = parseChunk(line);
      content += token;
      if (token && onToken) {
        onToken(token);
      }
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const token = parseChunk(buffer);
    content += token;
    if (token && onToken) {
      onToken(token);
    }
  }

  if (!content) {
    throw new Error("Ollama chat returned an empty response.");
  }

  return content;
}
