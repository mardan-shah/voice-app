"use client";

import { useCallback } from "react";

import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { Emotion } from "@/types";

export function useChat() {
  const {
    tabs,
    activeTabId,
    isGenerating,
    addUserMessage,
    addAssistantMessage,
    appendToLastMessage,
    finalizeLastMessage,
    setGenerating,
    setMemoriesUsed,
    updateTabTitle,
  } = useChatStore();
  
  const { aiSettings } = useSettingsStore();
  const { user } = useAuthStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const messages = activeTab?.messages ?? [];
  const sessionId = activeTab?.sessionId ?? "";

  const sendMessage = useCallback(
    async (content: string): Promise<string | undefined> => {
      if (!content.trim() || isGenerating || !user || !activeTabId) {
        return undefined;
      }

      // If it's the very first message in the tab, generate a title
      if (messages.length === 0) {
        const title = content.length > 25 ? `${content.substring(0, 25)}...` : content;
        updateTabTitle(activeTabId, title);
      }

      addUserMessage(content);
      setGenerating(true);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Your session has expired. Please log in again.");
        }

        const response = await fetch("/api/chat", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userMessage: content,
            history: messages.slice(-10),
            aiSettings,
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
        let finalContent: string | undefined = undefined;

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
              content?: string;
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
            if (parsed.done && parsed.emotion && parsed.content !== undefined) {
              finalizeLastMessage(parsed.content, parsed.emotion);
              finalContent = parsed.content;
            }
            if (parsed.memoriesUsed !== undefined) {
              setMemoriesUsed(parsed.memoriesUsed);
            }
          }
        }
        
        return finalContent;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected chat error.";
        addAssistantMessage(`Error: ${message}`, "neutral");
        return undefined;
      } finally {
        setGenerating(false);
      }
    },
    [
      activeTabId,
      addAssistantMessage,
      addUserMessage,
      aiSettings,
      appendToLastMessage,
      finalizeLastMessage,
      isGenerating,
      messages,
      sessionId,
      setGenerating,
      setMemoriesUsed,
      updateTabTitle,
      user,
    ]
  );

  return { messages, isGenerating, activeTabId, sendMessage };
}
