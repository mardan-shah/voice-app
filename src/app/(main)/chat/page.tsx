"use client";

import { useEffect, useRef, useState } from "react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { MessageInput } from "@/components/chat/MessageInput";
import { MicButton } from "@/components/chat/MicButton";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useVoice } from "@/hooks/useVoice";
import { getAISettings, getVoiceSettings } from "@/lib/supabase/db";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";

export default function ChatPage() {
  const { user } = useAuth(true);
  const { messages, isGenerating, sendMessage } = useChat();
  const { currentEmotion, memoriesUsed } = useChatStore();
  const { patchAISettings, patchVoiceSettings } = useSettingsStore();
  const { speak } = useVoice();
  const [speechError, setSpeechError] = useState<string | null>(null);
  const lastSpokenId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      const [aiSettings, voiceSettings] = await Promise.all([
        getAISettings(user.id),
        getVoiceSettings(user.id),
      ]);
      if (aiSettings) {
        patchAISettings(aiSettings);
      }
      if (voiceSettings) {
        patchVoiceSettings(voiceSettings);
      }
    })();
  }, [patchAISettings, patchVoiceSettings, user]);

  useEffect(() => {
    const latest = messages[messages.length - 1];
    if (!latest || latest.role !== "assistant" || isGenerating || lastSpokenId.current === latest.id) {
      return;
    }

    lastSpokenId.current = latest.id;
    void (async () => {
      try {
        await speak(latest.content);
        setSpeechError(null);
      } catch (error) {
        setSpeechError(error instanceof Error ? error.message : "Voice output failed.");
      }
    })();
  }, [isGenerating, messages, speak]);

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="emotion">Emotion: {currentEmotion}</Badge>
        {memoriesUsed > 0 ? <Badge variant="memory">🧠 {memoriesUsed} memories recalled</Badge> : null}
        {speechError ? <Badge variant="danger">Voice error: {speechError}</Badge> : null}
      </div>

      <div className="min-h-0 flex-1">
        <ChatWindow messages={messages} isGenerating={isGenerating} />
      </div>

      {isGenerating ? (
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <MessageInput onSend={sendMessage} disabled={isGenerating || !user} />
        <MicButton onTranscript={sendMessage} />
      </div>
    </div>
  );
}
