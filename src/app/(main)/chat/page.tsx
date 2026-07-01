"use client";

import { useEffect, useState } from "react";

import { ChatTabs } from "@/components/chat/ChatTabs";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { MessageInput } from "@/components/chat/MessageInput";
import { MicButton } from "@/components/chat/MicButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
  const { speak, isSpeaking, stopSpeaking } = useVoice();
  const [speechError, setSpeechError] = useState<string | null>(null);

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

  const handleSendMessage = async (content: string) => {
    const finalContent = await sendMessage(content);
    if (finalContent) {
      try {
        await speak(finalContent);
        setSpeechError(null);
      } catch (error) {
        setSpeechError(error instanceof Error ? error.message : "Voice output failed.");
      }
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col bg-white shadow-sm dark:bg-[#0b0f18] sm:border-x sm:border-slate-200/80 sm:dark:border-white/8">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-4 dark:border-white/8 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Conversation</h1>
          <p className="mt-1 text-xs text-slate-400">Private, personalized, and remembered.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isSpeaking && (
            <Button variant="danger" className="h-6 px-2 text-[10px]" onClick={stopSpeaking}>
              Stop Speaking
            </Button>
          )}
          <Badge variant="emotion">Emotion: {currentEmotion}</Badge>
          {memoriesUsed > 0 ? <Badge variant="memory">{memoriesUsed} memories recalled</Badge> : null}
          {speechError ? <Badge variant="danger">Voice error: {speechError}</Badge> : null}
        </div>
      </div>

      <ChatTabs />

      <div className="min-h-0 flex-1">
        <ChatWindow messages={messages} isGenerating={isGenerating} />
      </div>

      <div className="shrink-0 border-t border-slate-200/80 p-4 dark:border-white/8 sm:px-6 sm:pb-6">
        <div className="flex items-center gap-2">
          <MessageInput onSend={handleSendMessage} disabled={isGenerating || !user} />
          <MicButton onTranscript={handleSendMessage} />
        </div>
        <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-slate-400">
          <p>{isGenerating ? "Thinking..." : "Press Enter to send. Responses are spoken aloud when ElevenLabs is configured."}</p>
        </div>
      </div>
    </div>
  );
}
