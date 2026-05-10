"use client";

import { useEffect, useState } from "react";

import { PersonalitySelector } from "@/components/personality/PersonalitySelector";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { usePersonality } from "@/hooks/usePersonality";
import { getAISettings } from "@/lib/supabase/db";
import { useSettingsStore } from "@/store/settingsStore";
import type { AISettings, FormalityLevel, HumorLevel, ToneType } from "@/types";

export default function PersonalityPage() {
  const { user } = useAuth(true);
  const { aiSettings, savePersonality } = usePersonality();
  const { patchAISettings } = useSettingsStore();
  const [draft, setDraft] = useState<AISettings>(aiSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      const settings = await getAISettings(user.id);
      if (settings) {
        patchAISettings(settings);
        setDraft(settings);
      }
    })();
  }, [patchAISettings, user]);

  const save = async () => {
    setStatus(null);
    setIsSaving(true);
    try {
      await savePersonality(draft);
      setStatus("Saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Personality</h1>

      <PersonalitySelector
        current={draft}
        onChoosePreset={(preset) => setDraft((current) => ({ ...current, ...preset }))}
      />

      <Card className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Name</span>
          <Input
            value={draft.personalityName}
            onChange={(event) => setDraft((current) => ({ ...current, personalityName: event.target.value }))}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Humor</span>
            <select
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={draft.humor}
              onChange={(event) =>
                setDraft((current) => ({ ...current, humor: event.target.value as HumorLevel }))
              }
            >
              <option value="none">none</option>
              <option value="light">light</option>
              <option value="moderate">moderate</option>
              <option value="high">high</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Tone</span>
            <select
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={draft.tone}
              onChange={(event) =>
                setDraft((current) => ({ ...current, tone: event.target.value as ToneType }))
              }
            >
              <option value="warm">warm</option>
              <option value="professional">professional</option>
              <option value="playful">playful</option>
              <option value="serious">serious</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Formality</span>
            <select
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={draft.formality}
              onChange={(event) =>
                setDraft((current) => ({ ...current, formality: event.target.value as FormalityLevel }))
              }
            >
              <option value="casual">casual</option>
              <option value="neutral">neutral</option>
              <option value="formal">formal</option>
            </select>
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.thinkingMode}
            onChange={(event) =>
              setDraft((current) => ({ ...current, thinkingMode: event.target.checked }))
            }
          />
          Enable thinking mode
        </label>

        <div className="flex items-center gap-3">
          <Button onClick={() => void save()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          {status ? <span className="text-sm text-zinc-600 dark:text-zinc-400">{status}</span> : null}
        </div>
      </Card>
    </div>
  );
}
