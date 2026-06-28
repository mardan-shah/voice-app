function envOrDefault(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

const FIELDWAVES_URL = envOrDefault("FIELDWAVES_API_URL", "https://ai.fieldwaves.com/api/generate");
const USERNAME = envOrDefault("FIELDWAVES_USERNAME", "mardan");
const PASSWORD = process.env.FIELDWAVES_PASSWORD ?? "";
const MODEL = envOrDefault("FIELDWAVES_MODEL", "gemma4:e2b");

type FieldwavesResponse = {
  response?: string;
  message?: {
    content?: string;
  };
  done?: boolean;
  error?: string;
};

function parseChunk(line: string) {
  const trimmed = line.trim();
  const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
  if (!payload || payload === "[DONE]") {
    return "";
  }

  const data = JSON.parse(payload) as FieldwavesResponse;
  if (data.error) {
    throw new Error(data.error);
  }
  return data.response ?? data.message?.content ?? "";
}

/**
 * Chat with Fieldwaves AI API.
 * Replaces the previous Ollama implementation as requested.
 */
export async function chatWithOllama(
  messages: { role: string; content: string }[],
  onToken?: (token: string) => void
): Promise<string> {
  // Convert chat messages to a single prompt string for the generation endpoint
  const prompt = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n") + "\n\nASSISTANT:";

  const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");

  const response = await fetch(FIELDWAVES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: prompt,
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
    throw new Error(`Fieldwaves AI failed: ${response.status} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("Fieldwaves AI returned an empty response stream.");
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
    throw new Error("Fieldwaves AI returned an empty response.");
  }

  return content;
}
