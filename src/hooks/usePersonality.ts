"use client";

import { useCallback } from "react";

import { updateAISettings } from "@/lib/supabase/db";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { AISettings } from "@/types";

export function usePersonality() {
  const { user } = useAuthStore();
  const { aiSettings, patchAISettings } = useSettingsStore();

  const savePersonality = useCallback(
    async (settings: Partial<AISettings>) => {
      if (!user) {
        throw new Error("You must be logged in to change personality settings.");
      }

      await updateAISettings(user.id, settings);
      patchAISettings(settings);
    },
    [patchAISettings, user]
  );

  return { aiSettings, savePersonality };
}
