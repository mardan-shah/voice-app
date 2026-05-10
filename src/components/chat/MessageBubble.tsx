"use client";

import ReactMarkdown from "react-markdown";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

type MessageBubbleProps = {
  message: Message;
  isStreaming?: boolean;
};

const emotionLabel: Record<string, string> = {
  happy: "😊 happy",
  sad: "😢 sad",
  angry: "😠 angry",
  anxious: "😰 anxious",
  neutral: "😐 neutral",
  excited: "🤩 excited",
};

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-4 py-3 text-sm sm:max-w-[75%]",
          isUser ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        <div className={cn("mt-2 flex items-center gap-2", isUser ? "justify-end" : "justify-start")}>
          {!isUser && message.emotion ? (
            <Badge variant="emotion">{emotionLabel[message.emotion] ?? message.emotion}</Badge>
          ) : null}
          {isStreaming ? <span className="animate-pulse text-xs">▋</span> : null}
        </div>
      </div>
    </div>
  );
}
