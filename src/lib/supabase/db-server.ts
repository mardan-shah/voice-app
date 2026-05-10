import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Emotion, Memory, Message } from "@/types";
import { createServiceClient } from "./server";

type MemoryRow = {
  content: string;
  role: "user" | "assistant";
  similarity: number;
  created_at: string;
};

function toMemory(row: MemoryRow): Memory {
  return {
    content: row.content,
    role: row.role,
    similarity: row.similarity,
    createdAt: row.created_at,
  };
}

function getServiceClient(client?: SupabaseClient) {
  return client ?? createServiceClient();
}

export async function saveChatMessageServer(
  userId: string,
  sessionId: string,
  message: Message,
  client?: SupabaseClient
): Promise<string> {
  const supabase = getServiceClient(client);
  const { data, error } = await supabase
    .from("chat_history")
    .insert({
      user_id: userId,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      emotion: message.emotion ?? "neutral",
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw error;
  }
  return data.id;
}

export async function saveEmotionDataServer(
  userId: string,
  emotion: Emotion,
  client?: SupabaseClient
) {
  const supabase = getServiceClient(client);
  const { error } = await supabase.from("emotion_data").insert({
    user_id: userId,
    emotion_type: emotion,
  });

  if (error) {
    throw error;
  }
}

export async function saveEmbeddingServer(
  userId: string,
  chatHistoryId: string,
  content: string,
  role: "user" | "assistant",
  embedding: number[],
  client?: SupabaseClient
) {
  const supabase = getServiceClient(client);
  const { error } = await supabase.from("message_embeddings").insert({
    user_id: userId,
    chat_history_id: chatHistoryId,
    content,
    role,
    embedding,
  });

  if (error) {
    throw error;
  }
}

export async function searchMemoriesServer(
  userId: string,
  queryEmbedding: number[],
  count = 3,
  client?: SupabaseClient
): Promise<Memory[]> {
  const supabase = getServiceClient(client);
  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: count,
  });

  if (error) {
    throw error;
  }

  return ((data as MemoryRow[] | null) ?? []).map(toMemory);
}
