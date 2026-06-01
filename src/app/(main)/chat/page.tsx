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
    <div className="mx-auto flex h-full max-w-5xl flex-col px-4 sm:px-6">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 py-5 dark:border-white/8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Conversation</h1>
          <p className="mt-1 text-xs text-slate-400">Private, personalized, and remembered.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="emotion">Emotion: {currentEmotion}</Badge>
          {memoriesUsed > 0 ? <Badge variant="memory">{memoriesUsed} memories recalled</Badge> : null}
        {speechError ? <Badge variant="danger">Voice error: {speechError}</Badge> : null}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ChatWindow messages={messages} isGenerating={isGenerating} />
      </div>

      <div className="shrink-0 border-t border-slate-200/80 py-4 dark:border-white/8">
        <div className="flex items-center gap-2">
        <MessageInput onSend={sendMessage} disabled={isGenerating || !user} />
        <MicButton onTranscript={sendMessage} />
        </div>
        <p className="mt-2 px-2 text-[11px] text-slate-400">
          {isGenerating ? "Gemma is responding..." : "Press Enter to send. Responses are spoken aloud when browser voice is available."}
        </p>
      </div>
    </div>
  );
}
