import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import type { Emotion, Message } from "@/types";

interface ChatState {
  messages: Message[];
  isGenerating: boolean;
  currentEmotion: Emotion;
  sessionId: string;
  memoriesUsed: number;
  addUserMessage: (content: string) => Message;
  addAssistantMessage: (content: string, emotion: Emotion) => void;
  appendToLastMessage: (token: string) => void;
  setGenerating: (value: boolean) => void;
  setEmotion: (emotion: Emotion) => void;
  setMemoriesUsed: (value: number) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  newSession: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isGenerating: false,
  currentEmotion: "neutral",
  sessionId: uuidv4(),
  memoriesUsed: 0,

  addUserMessage: (content) => {
    const message: Message = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    return message;
  },

  addAssistantMessage: (content, emotion) => {
    const message: Message = {
      id: uuidv4(),
      role: "assistant",
      content,
      emotion,
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, message],
      currentEmotion: emotion,
    }));
  },

  appendToLastMessage: (token) => {
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = { ...last, content: `${last.content}${token}` };
      } else {
        messages.push({
          id: uuidv4(),
          role: "assistant",
          content: token,
          timestamp: new Date(),
        });
      }

      return { messages };
    });
  },

  setGenerating: (isGenerating) => set({ isGenerating }),
  setEmotion: (currentEmotion) => set({ currentEmotion }),
  setMemoriesUsed: (memoriesUsed) => set({ memoriesUsed }),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),
  newSession: () => set({ messages: [], sessionId: uuidv4(), memoriesUsed: 0 }),
}));
