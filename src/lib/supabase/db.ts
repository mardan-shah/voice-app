import type { AISettings, Message, VoiceSettings } from "@/types";

import { createClient } from "./client";
import { normalizeVoiceSettings } from "../voice/settings";

type AISettingsRow = {
  id: string;
  user_id: string;
  personality_name: string;
  humor: AISettings["humor"];
  tone: AISettings["tone"];
  formality: AISettings["formality"];
  thinking_mode: boolean;
};

type VoiceSettingsRow = {
  id: string;
  user_id: string;
  provider?: string | null;
  pitch: number;
  rate: number;
  volume: number;
  voice_name: string;
  voice_id?: string | null;
  voice_model_id?: string | null;
  language: string;
  stability?: number | null;
  similarity_boost?: number | null;
  style?: number | null;
  speaker_boost?: boolean | null;
  speed?: number | null;
};


function toAISettings(row: AISettingsRow): AISettings {
  return {
    id: row.id,
    userId: row.user_id,
    personalityName: row.personality_name,
    humor: row.humor,
    tone: row.tone,
    formality: row.formality,
    thinkingMode: row.thinking_mode,
  };
}

function toVoiceSettings(row: VoiceSettingsRow): VoiceSettings {
  return normalizeVoiceSettings({
    id: row.id,
    userId: row.user_id,
    provider: "elevenlabs",
    pitch: row.pitch,
    rate: row.rate,
    volume: row.volume,
    voiceName: row.voice_name,
    voiceId: row.voice_id ?? "",
    modelId: row.voice_model_id ?? "",
    language: row.language,
    stability: row.stability ?? undefined,
    similarityBoost: row.similarity_boost ?? undefined,
    style: row.style ?? undefined,
    speakerBoost: row.speaker_boost ?? undefined,
    speed: row.speed ?? row.rate,
  });
}


export async function getAISettings(userId: string): Promise<AISettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<AISettingsRow>();

  if (error) {
    throw error;
  }
  return data ? toAISettings(data) : null;
}

export async function updateAISettings(userId: string, settings: Partial<AISettings>) {
  const supabase = createClient();
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (settings.personalityName !== undefined) payload.personality_name = settings.personalityName;
  if (settings.humor !== undefined) payload.humor = settings.humor;
  if (settings.tone !== undefined) payload.tone = settings.tone;
  if (settings.formality !== undefined) payload.formality = settings.formality;
  if (settings.thinkingMode !== undefined) payload.thinking_mode = settings.thinkingMode;

  const { error } = await supabase.from("ai_settings").upsert(payload, { onConflict: "user_id" });
  if (error) {
    throw error;
  }
}

export async function getVoiceSettings(userId: string): Promise<VoiceSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("voice_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<VoiceSettingsRow>();

  if (error) {
    throw error;
  }
  return data ? toVoiceSettings(data) : null;
}

export async function updateVoiceSettings(userId: string, settings: Partial<VoiceSettings>) {
  const supabase = createClient();
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (settings.pitch !== undefined) payload.pitch = settings.pitch;
  if (settings.rate !== undefined) payload.rate = settings.rate;
  if (settings.volume !== undefined) payload.volume = settings.volume;
  if (settings.provider !== undefined) payload.provider = settings.provider;
  if (settings.voiceName !== undefined) payload.voice_name = settings.voiceName;
  if (settings.voiceId !== undefined) payload.voice_id = settings.voiceId;
  if (settings.modelId !== undefined) payload.voice_model_id = settings.modelId;
  if (settings.language !== undefined) payload.language = settings.language;
  if (settings.stability !== undefined) payload.stability = settings.stability;
  if (settings.similarityBoost !== undefined) payload.similarity_boost = settings.similarityBoost;
  if (settings.style !== undefined) payload.style = settings.style;
  if (settings.speakerBoost !== undefined) payload.speaker_boost = settings.speakerBoost;
  if (settings.speed !== undefined) payload.speed = settings.speed;

  const { error } = await supabase.from("voice_settings").upsert(payload, { onConflict: "user_id" });
  if (error) {
    throw error;
  }
}

