import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_VOICE_SETTINGS, normalizeVoiceSettings } from "@/lib/voice/settings";
import type { AISettings, VoiceSettings } from "@/types";

const DEFAULT_AI_SETTINGS: AISettings = {
  id: "",
  userId: "",
  personalityName: "Friendly Helper",
  humor: "light",
  tone: "warm",
  formality: "casual",
  thinkingMode: false,
};

interface SettingsState {
  aiSettings: AISettings;
  voiceSettings: VoiceSettings;
  setAISettings: (settings: AISettings) => void;
  patchAISettings: (settings: Partial<AISettings>) => void;
  setVoiceSettings: (settings: VoiceSettings) => void;
  patchVoiceSettings: (settings: Partial<VoiceSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      aiSettings: DEFAULT_AI_SETTINGS,
      voiceSettings: DEFAULT_VOICE_SETTINGS,
      setAISettings: (aiSettings) => set({ aiSettings }),
      patchAISettings: (settings) =>
        set((state) => ({ aiSettings: { ...state.aiSettings, ...settings } })),
      setVoiceSettings: (voiceSettings) => set({ voiceSettings: normalizeVoiceSettings(voiceSettings) }),
      patchVoiceSettings: (settings) =>
        set((state) => ({ voiceSettings: normalizeVoiceSettings({ ...state.voiceSettings, ...settings }) })),
    }),
    {
      name: "settings-store",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined;
        return {
          ...currentState,
          ...persisted,
          voiceSettings: normalizeVoiceSettings(persisted?.voiceSettings),
        };
      },
    }
  )
);
