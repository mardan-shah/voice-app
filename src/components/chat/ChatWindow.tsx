"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

type ChatWindowProps = {
  messages: Message[];
  isGenerating: boolean;
};

export function ChatWindow({ messages, isGenerating }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isGenerating]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-2xl text-blue-600 shadow-xl shadow-blue-500/10 dark:border-blue-400/15 dark:bg-blue-500/10 dark:text-blue-300">
            ✦
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Start a conversation</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Your companion can remember context, respond with voice, and adapt to your preferred personality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-1 py-4 sm:px-3">
      <div className="space-y-6">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isGenerating && index === messages.length - 1 && message.role === "assistant"}
          />
        ))}
        <div ref={bottomRef} className={cn("h-1")} />
      </div>
    </div>
  );
}
