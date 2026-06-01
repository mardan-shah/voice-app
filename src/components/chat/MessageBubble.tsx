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
  const visibleContent = message.content.replace(/\n?EMOTION_DETECTED:[\s\S]*$/m, "").trim();

  return (
    <div className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-600/20">
          A
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-6 sm:max-w-[72%]",
          isUser
            ? "rounded-tr-md bg-blue-600 text-white shadow-md shadow-blue-600/10"
            : "rounded-tl-md border border-slate-200/80 bg-white text-slate-700 shadow-sm dark:border-white/8 dark:bg-white/6 dark:text-slate-200"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{visibleContent}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{visibleContent}</ReactMarkdown>
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
