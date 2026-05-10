import type { AISettings, Message, VoiceSettings } from "@/types";

import { createClient } from "./client";

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
  pitch: number;
  rate: number;
  volume: number;
  voice_name: string;
  language: string;
};

type ChatHistoryRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion: Message["emotion"];
  created_at: string;
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
  return {
    id: row.id,
    userId: row.user_id,
    pitch: row.pitch,
    rate: row.rate,
    volume: row.volume,
    voiceName: row.voice_name,
    language: row.language,
  };
}

function toMessage(row: ChatHistoryRow): Message {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    emotion: row.emotion ?? "neutral",
    timestamp: new Date(row.created_at),
  };
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
    updated_at: new Date().toISOString(),
  };

  if (settings.personalityName !== undefined) payload.personality_name = settings.personalityName;
  if (settings.humor !== undefined) payload.humor = settings.humor;
  if (settings.tone !== undefined) payload.tone = settings.tone;
  if (settings.formality !== undefined) payload.formality = settings.formality;
  if (settings.thinkingMode !== undefined) payload.thinking_mode = settings.thinkingMode;

  const { error } = await supabase.from("ai_settings").update(payload).eq("user_id", userId);
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
    updated_at: new Date().toISOString(),
  };

  if (settings.pitch !== undefined) payload.pitch = settings.pitch;
  if (settings.rate !== undefined) payload.rate = settings.rate;
  if (settings.volume !== undefined) payload.volume = settings.volume;
  if (settings.voiceName !== undefined) payload.voice_name = settings.voiceName;
  if (settings.language !== undefined) payload.language = settings.language;

  const { error } = await supabase.from("voice_settings").update(payload).eq("user_id", userId);
  if (error) {
    throw error;
  }
}

export async function getChatHistory(userId: string, limitCount = 50): Promise<Message[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_history")
    .select("id, role, content, emotion, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limitCount)
    .returns<ChatHistoryRow[]>();

  if (error) {
    throw error;
  }
  return (data ?? []).map(toMessage);
}
