"use client";

import { useCallback } from "react";

import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { Emotion } from "@/types";

export function useChat() {
  const {
    messages,
    isGenerating,
    addUserMessage,
    addAssistantMessage,
    appendToLastMessage,
    setGenerating,
    setEmotion,
    setMemoriesUsed,
    sessionId,
  } = useChatStore();
  const { aiSettings } = useSettingsStore();
  const { user } = useAuthStore();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating || !user) {
        return;
      }

      addUserMessage(content);
      setGenerating(true);

      try {
        const response = await fetch("/api/chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: content,
            history: messages.slice(-10),
            aiSettings,
            userId: user.id,
            sessionId,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? `Request failed with status ${response.status}`);
        }
        if (!response.body) {
          throw new Error("No stream returned by chat endpoint.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const boundary = buffer.indexOf("\n\n");
            if (boundary === -1) {
              break;
            }

            const eventBlock = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);
            if (!eventBlock.startsWith("data:")) {
              continue;
            }

            const payload = eventBlock.slice(5).trim();
            const parsed = JSON.parse(payload) as {
              token?: string;
              done?: boolean;
              emotion?: Emotion;
              memoriesUsed?: number;
              error?: string;
            };

            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.token) {
              appendToLastMessage(parsed.token);
            }
            if (parsed.done && parsed.emotion) {
              setEmotion(parsed.emotion);
            }
            if (parsed.memoriesUsed !== undefined) {
              setMemoriesUsed(parsed.memoriesUsed);
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected chat error.";
        addAssistantMessage(`Error: ${message}`, "neutral");
      } finally {
        setGenerating(false);
      }
    },
    [
      addAssistantMessage,
      addUserMessage,
      aiSettings,
      appendToLastMessage,
      isGenerating,
      messages,
      sessionId,
      setEmotion,
      setGenerating,
      setMemoriesUsed,
      user,
    ]
  );

  return { messages, isGenerating, sendMessage };
}
