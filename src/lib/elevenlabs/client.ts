import "server-only";

import type { VoiceOption, VoiceSettings } from "@/types";

function envOrDefault(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function clamp(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

const BASE_URL = normalizeBaseUrl(envOrDefault("ELEVENLABS_API_URL", "https://api.elevenlabs.io"));
const DEFAULT_MODEL_ID = envOrDefault("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2");
const DEFAULT_OUTPUT_FORMAT = envOrDefault("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128");

type ElevenLabsVoiceResponse = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
};

type ElevenLabsVoicesResponse = {
  voices?: ElevenLabsVoiceResponse[];
};

function getApiKey() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing ELEVENLABS_API_KEY.");
  }
  return apiKey;
}

function getDefaultVoiceId() {
  const voiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim();
  if (!voiceId) {
    throw new Error("Missing ELEVENLABS_DEFAULT_VOICE_ID.");
  }
  return voiceId;
}

export async function listElevenLabsVoices(): Promise<VoiceOption[]> {
  const response = await fetch(`${BASE_URL}/v2/voices`, {
    headers: {
      "xi-api-key": getApiKey(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs voices request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as ElevenLabsVoicesResponse;
  return (data.voices ?? []).map((voice) => ({
    voiceId: voice.voice_id,
    name: voice.name,
    category: voice.category ?? "",
    description: voice.description ?? "",
    previewUrl: voice.preview_url ?? "",
    labels: voice.labels ?? {},
  }));
}

export async function createElevenLabsSpeechStream(
  text: string,
  settings?: Partial<VoiceSettings>
) {
  const voiceId = settings?.voiceId?.trim() || getDefaultVoiceId();
  const modelId = settings?.modelId?.trim() || DEFAULT_MODEL_ID;
  const outputFormat = DEFAULT_OUTPUT_FORMAT;
  const url = `${BASE_URL}/v1/text-to-speech/${encodeURIComponent(
    voiceId
  )}/stream?output_format=${encodeURIComponent(outputFormat)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": getApiKey(),
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: clamp(settings?.stability, 0, 1, 0.5),
        similarity_boost: clamp(settings?.similarityBoost, 0, 1, 0.75),
        style: clamp(settings?.style, 0, 1, 0),
        use_speaker_boost: settings?.speakerBoost ?? true,
        speed: clamp(settings?.speed ?? settings?.rate, 0.7, 1.2, 1),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs speech request failed: ${response.status} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("ElevenLabs returned an empty audio stream.");
  }

  return response;
}
