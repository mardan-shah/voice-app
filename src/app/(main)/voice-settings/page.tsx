"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useVoice } from "@/hooks/useVoice";
import { getVoiceSettings, updateVoiceSettings } from "@/lib/supabase/db";
import { useSettingsStore } from "@/store/settingsStore";
import type { VoiceSettings } from "@/types";

export default function VoiceSettingsPage() {
  const { user } = useAuth(true);
  const { voiceSettings, patchVoiceSettings } = useSettingsStore();
  const { speak } = useVoice();
  const [draft, setDraft] = useState<VoiceSettings>(voiceSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncVoices = () => setVoices(window.speechSynthesis.getVoices());
    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      const settings = await getVoiceSettings(user.id);
      if (settings) {
        patchVoiceSettings(settings);
        setDraft(settings);
      }
    })();
  }, [patchVoiceSettings, user]);

  const save = async () => {
    if (!user) {
      return;
    }

    setStatus(null);
    try {
      await updateVoiceSettings(user.id, draft);
      patchVoiceSettings(draft);
      setStatus("Saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save voice settings.");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Voice settings</h1>

      <Card className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Voice</span>
          <select
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={draft.voiceName}
            onChange={(event) => setDraft((current) => ({ ...current, voiceName: event.target.value }))}
          >
            <option value="">System default</option>
            {voices.map((voice) => (
              <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Language</span>
          <input
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
            value={draft.language}
            onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value }))}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Pitch: {draft.pitch.toFixed(1)}</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={draft.pitch}
            onChange={(event) => setDraft((current) => ({ ...current, pitch: Number(event.target.value) }))}
            className="w-full"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Speed: {draft.rate.toFixed(1)}</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={draft.rate}
            onChange={(event) => setDraft((current) => ({ ...current, rate: Number(event.target.value) }))}
            className="w-full"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Volume: {draft.volume.toFixed(1)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={draft.volume}
            onChange={(event) => setDraft((current) => ({ ...current, volume: Number(event.target.value) }))}
            className="w-full"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void save()}>Save</Button>
          <Button
            variant="secondary"
            onClick={() => void speak("This is a test of your selected AI companion voice settings.")}
          >
            Test voice
          </Button>
          {status ? <span className="text-sm text-zinc-600 dark:text-zinc-400">{status}</span> : null}
        </div>
      </Card>
    </div>
  );
}
