export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

export type Emotion = "happy" | "sad" | "angry" | "anxious" | "neutral" | "excited";
export type HumorLevel = "none" | "light" | "moderate" | "high";
export type FormalityLevel = "casual" | "neutral" | "formal";
export type ToneType = "warm" | "professional" | "playful" | "serious";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  emotion?: Emotion;
}

export interface AISettings {
  id: string;
  userId: string;
  personalityName: string;
  humor: HumorLevel;
  tone: ToneType;
  formality: FormalityLevel;
  thinkingMode: boolean;
}

export interface VoiceSettings {
  id: string;
  userId: string;
  pitch: number;
  rate: number;
  volume: number;
  voiceName: string;
  language: string;
}

export interface Memory {
  content: string;
  role: "user" | "assistant";
  similarity: number;
  createdAt: string;
}

export interface OllamaRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  options?: {
    temperature: number;
    top_p: number;
    top_k: number;
    num_ctx: number;
    num_predict: number;
  };
}
