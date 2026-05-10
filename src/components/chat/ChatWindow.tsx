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
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-300 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Start the conversation by sending your first message.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="space-y-4">
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
