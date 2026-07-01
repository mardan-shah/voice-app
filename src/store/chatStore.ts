import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

import type { Emotion, Message, ChatTab } from "@/types";

interface ChatState {
  tabs: ChatTab[];
  activeTabId: string;
  isGenerating: boolean;
  currentEmotion: Emotion;
  memoriesUsed: number;
  
  // Tab Actions
  createTab: () => string;
  deleteTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;

  // Message Actions (apply to active tab)
  addUserMessage: (content: string) => Message | null;
  addAssistantMessage: (content: string, emotion: Emotion) => void;
  appendToLastMessage: (token: string) => void;
  finalizeLastMessage: (content: string, emotion: Emotion) => void;
  
  // Global Actions
  setGenerating: (value: boolean) => void;
  setEmotion: (emotion: Emotion) => void;
  setMemoriesUsed: (value: number) => void;
}

function createNewTab(): ChatTab {
  return {
    id: uuidv4(),
    title: "New Chat",
    messages: [],
    sessionId: uuidv4(),
    createdAt: new Date(),
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      tabs: [createNewTab()],
      activeTabId: "", 
      isGenerating: false,
      currentEmotion: "neutral",
      memoriesUsed: 0,

      createTab: () => {
        const newTab = createNewTab();
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
          currentEmotion: "neutral",
          memoriesUsed: 0,
        }));
        return newTab.id;
      },

      deleteTab: (tabId) => {
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== tabId);
          if (newTabs.length === 0) {
            const freshTab = createNewTab();
            return { tabs: [freshTab], activeTabId: freshTab.id };
          }
          
          let newActiveId = state.activeTabId;
          if (state.activeTabId === tabId) {
            const idx = state.tabs.findIndex((t) => t.id === tabId);
            const prev = state.tabs[idx - 1];
            const next = state.tabs[idx + 1];
            newActiveId = (next || prev).id;
          }
          return { tabs: newTabs, activeTabId: newActiveId };
        });
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      updateTabTitle: (tabId, title) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, title } : t
          ),
        }));
      },

      addUserMessage: (content) => {
        const { tabs, activeTabId } = get();
        if (!activeTabId) return null;

        const message: Message = {
          id: uuidv4(),
          role: "user",
          content,
          timestamp: new Date(),
        };

        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === state.activeTabId
              ? { ...t, messages: [...t.messages, message] }
              : t
          ),
        }));
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
          tabs: state.tabs.map((t) =>
            t.id === state.activeTabId
              ? { ...t, messages: [...t.messages, message] }
              : t
          ),
          currentEmotion: emotion,
        }));
      },

      appendToLastMessage: (token) => {
        set((state) => {
          return {
            tabs: state.tabs.map((t) => {
              if (t.id !== state.activeTabId) return t;
              
              const messages = [...t.messages];
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
              return { ...t, messages };
            })
          };
        });
      },

      finalizeLastMessage: (content, emotion) => {
        set((state) => ({
          tabs: state.tabs.map((t) => {
            if (t.id !== state.activeTabId) return t;
            const messages = [...t.messages];
            const last = messages[messages.length - 1];
            if (last?.role === "assistant") {
              messages[messages.length - 1] = { ...last, content, emotion };
            }
            return { ...t, messages };
          }),
          currentEmotion: emotion,
        }));
      },

      setGenerating: (isGenerating) => set({ isGenerating }),
      setEmotion: (currentEmotion) => set({ currentEmotion }),
      setMemoriesUsed: (memoriesUsed) => set({ memoriesUsed }),
    }),
    {
      name: "chat-tabs-store",
      onRehydrateStorage: () => (state) => {
        if (state) {
           if (state.tabs) {
             state.tabs.forEach(tab => {
               tab.createdAt = new Date(tab.createdAt);
               tab.messages.forEach(msg => {
                 msg.timestamp = new Date(msg.timestamp);
               });
             });
           }

           if (!state.activeTabId || !state.tabs || state.tabs.length === 0) {
              if (state.tabs && state.tabs.length > 0) {
                  state.activeTabId = state.tabs[0].id;
              } else {
                  const newTab = createNewTab();
                  state.tabs = [newTab];
                  state.activeTabId = newTab.id;
              }
           }
        }
      },
    }
  )
);
