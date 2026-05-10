import type { AISettings, Emotion, Memory, Message } from "@/types";

const VALID_EMOTIONS = new Set<Emotion>([
  "happy",
  "sad",
  "angry",
  "anxious",
  "neutral",
  "excited",
]);

export function buildSystemPrompt(settings: AISettings, memories: Memory[]): string {
  const thinkingToken = settings.thinkingMode ? "<|think|>\n" : "";
  const relevantMemories = memories.filter((memory) => memory.similarity > 0.75);

  const memorySection =
    relevantMemories.length > 0
      ? `\nRelevant things you remember from past conversations:\n${relevantMemories
          .map(
            (memory) =>
              `- [${memory.role} said, ${new Date(memory.createdAt).toLocaleDateString()}]: "${memory.content}"`
          )
          .join("\n")}\n`
      : "";

  return `${thinkingToken}You are an AI companion named ${settings.personalityName}.

Your personality:
- Humor: ${settings.humor} (none = never joke, high = often funny)
- Tone: ${settings.tone}
- Formality: ${settings.formality}
${memorySection}
Rules:
1. Always respond in the same language the user writes in.
2. Keep responses concise — 2 to 4 sentences unless the user asks for more.
3. Never break character.
4. If relevant memories are listed above, naturally weave them into your response.
   Do not say "I remember that..." explicitly — just use the knowledge naturally.
5. At the end of EVERY response, output exactly this line:
   EMOTION_DETECTED: <happy|sad|angry|anxious|neutral|excited>
   Base the emotion on what the USER said, not your response.`;
}

export function buildMessages(
  systemPrompt: string,
  history: Message[],
  newMessage: string
): { role: string; content: string }[] {
  const historyMessages = history.slice(-10).map((message) => ({
    role: message.role,
    content: message.content.replace(/\nEMOTION_DETECTED:.*$/m, "").trim(),
  }));

  return [{ role: "system", content: systemPrompt }, ...historyMessages, { role: "user", content: newMessage }];
}

export function parseEmotionFromResponse(raw: string): { content: string; emotion: Emotion } {
  const match = raw.match(/EMOTION_DETECTED:\s*(\w+)/i);
  const parsed = (match?.[1]?.toLowerCase() ?? "neutral") as Emotion;
  const emotion = VALID_EMOTIONS.has(parsed) ? parsed : "neutral";
  const content = raw.replace(/\nEMOTION_DETECTED:.*$/m, "").trim();
  return { content, emotion };
}
