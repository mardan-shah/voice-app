import type { OllamaRequest } from "@/types";

const BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "gemma3:2b";

type OllamaChunk = {
  message?: { content?: string };
  error?: string;
};

type OllamaResponse = {
  message?: { content?: string };
  error?: string;
};

function parseNdjsonChunk(buffer: string): { lines: string[]; remainder: string } {
  const parts = buffer.split("\n");
  const remainder = parts.pop() ?? "";
  const lines = parts.map((line) => line.trim()).filter(Boolean);
  return { lines, remainder };
}

export async function chatWithOllama(
  messages: { role: string; content: string }[],
  onToken?: (token: string) => void
): Promise<string> {
  const body: OllamaRequest = {
    model: MODEL,
    messages,
    stream: Boolean(onToken),
    options: {
      temperature: 1.0,
      top_p: 0.95,
      top_k: 64,
      num_ctx: 8192,
      num_predict: 400,
    },
  };

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama chat failed: ${response.status} ${response.statusText}`);
  }

  if (onToken && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseNdjsonChunk(buffer);
      buffer = parsed.remainder;

      for (const line of parsed.lines) {
        const chunk = JSON.parse(line) as OllamaChunk;
        if (chunk.error) {
          throw new Error(chunk.error);
        }
        const token = chunk.message?.content;
        if (token) {
          fullContent += token;
          onToken(token);
        }
      }
    }

    if (buffer.trim().length > 0) {
      const chunk = JSON.parse(buffer.trim()) as OllamaChunk;
      if (chunk.error) {
        throw new Error(chunk.error);
      }
      const token = chunk.message?.content;
      if (token) {
        fullContent += token;
        onToken(token);
      }
    }

    return fullContent;
  }

  const data = (await response.json()) as OllamaResponse;
  if (data.error) {
    throw new Error(data.error);
  }
  return data.message?.content ?? "";
}
