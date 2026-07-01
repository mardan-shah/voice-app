"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useVoice } from "@/hooks/useVoice";
import { getSession } from "@/lib/supabase/auth";
import { getVoiceSettings, updateVoiceSettings } from "@/lib/supabase/db";
import { normalizeVoiceSettings } from "@/lib/voice/settings";
import { useSettingsStore } from "@/store/settingsStore";
import type { VoiceOption, VoiceSettings } from "@/types";

export default function VoiceSettingsPage() {
  const { user } = useAuth(true);
  const { voiceSettings, patchVoiceSettings } = useSettingsStore();
  const { speak } = useVoice();
  const [draft, setDraft] = useState<VoiceSettings>(() => normalizeVoiceSettings(voiceSettings));
  const [status, setStatus] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      setIsLoadingVoices(true);
      try {
        const session = await getSession();
        if (!session?.access_token) {
          throw new Error("Sign in before loading voices.");
        }

        const response = await fetch("/api/voice/voices", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = (await response.json().catch(() => null)) as
          | { voices?: VoiceOption[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.error ?? "Unable to load ElevenLabs voices.");
        }

        setVoices(data?.voices ?? []);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load ElevenLabs voices.");
      } finally {
        setIsLoadingVoices(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      const settings = await getVoiceSettings(user.id);
      if (settings) {
        const normalizedSettings = normalizeVoiceSettings(settings);
        patchVoiceSettings(normalizedSettings);
        setDraft(normalizedSettings);
      }
    })();
  }, [patchVoiceSettings, user]);

  const save = async () => {
    if (!user) {
      return;
    }

    setStatus(null);
    try {
      const normalizedDraft = normalizeVoiceSettings(draft);
      await updateVoiceSettings(user.id, normalizedDraft);
      patchVoiceSettings(normalizedDraft);
      setDraft(normalizedDraft);
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
            value={draft.voiceId}
            onChange={(event) => {
              const voice = voices.find((item) => item.voiceId === event.target.value);
              setDraft((current) => ({
                ...current,
                voiceId: event.target.value,
                voiceName: voice?.name ?? "",
              }));
            }}
          >
            <option value="">{isLoadingVoices ? "Loading voices..." : "Default ElevenLabs voice"}</option>
            {voices.map((voice) => (
              <option key={voice.voiceId} value={voice.voiceId}>
                {voice.name}
                {voice.category ? ` (${voice.category})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Model ID</span>
          <input
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="eleven_multilingual_v2"
            value={draft.modelId}
            onChange={(event) => setDraft((current) => ({ ...current, modelId: event.target.value }))}
          />
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
          <span className="font-medium">Stability: {draft.stability.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={draft.stability}
            onChange={(event) => setDraft((current) => ({ ...current, stability: Number(event.target.value) }))}
            className="w-full"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Similarity: {draft.similarityBoost.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={draft.similarityBoost}
            onChange={(event) =>
              setDraft((current) => ({ ...current, similarityBoost: Number(event.target.value) }))
            }
            className="w-full"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Style: {draft.style.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={draft.style}
            onChange={(event) => setDraft((current) => ({ ...current, style: Number(event.target.value) }))}
            className="w-full"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Speed: {draft.speed.toFixed(2)}</span>
          <input
            type="range"
            min={0.7}
            max={1.2}
            step={0.05}
            value={draft.speed}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                speed: Number(event.target.value),
                rate: Number(event.target.value),
              }))
            }
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.speakerBoost}
            onChange={(event) => setDraft((current) => ({ ...current, speakerBoost: event.target.checked }))}
          />
          <span className="font-medium">Speaker boost</span>
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
