"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

type MessageInputProps = {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
};

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [value, setValue] = useState("");

  const submit = async () => {
    const content = value.trim();
    if (!content) {
      return;
    }

    setValue("");
    await onSend(content);
  };

  return (
    <div className="flex flex-1 items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 transition focus-within:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="Type your message..."
        disabled={disabled}
        rows={1}
        className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100"
      />
      <Button className="h-10 rounded-xl px-4" onClick={() => void submit()} disabled={disabled || !value.trim()}>
        Send
      </Button>
    </div>
  );
}
