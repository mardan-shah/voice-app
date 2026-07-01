import type { VoiceSettings } from "@/types";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  id: "",
  userId: "",
  provider: "elevenlabs",
  pitch: 1,
  rate: 1,
  volume: 1,
  voiceName: "",
  voiceId: "",
  modelId: "",
  language: "en-US",
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  speakerBoost: true,
  speed: 1,
};

function numberOrDefault(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeVoiceSettings(settings?: Partial<VoiceSettings> | null): VoiceSettings {
  return {
    ...DEFAULT_VOICE_SETTINGS,
    ...settings,
    provider: "elevenlabs",
    pitch: numberOrDefault(settings?.pitch, DEFAULT_VOICE_SETTINGS.pitch),
    rate: numberOrDefault(settings?.rate, DEFAULT_VOICE_SETTINGS.rate),
    volume: numberOrDefault(settings?.volume, DEFAULT_VOICE_SETTINGS.volume),
    stability: numberOrDefault(settings?.stability, DEFAULT_VOICE_SETTINGS.stability),
    similarityBoost: numberOrDefault(
      settings?.similarityBoost,
      DEFAULT_VOICE_SETTINGS.similarityBoost
    ),
    style: numberOrDefault(settings?.style, DEFAULT_VOICE_SETTINGS.style),
    speed: numberOrDefault(settings?.speed, DEFAULT_VOICE_SETTINGS.speed),
    speakerBoost: settings?.speakerBoost ?? DEFAULT_VOICE_SETTINGS.speakerBoost,
  };
}
