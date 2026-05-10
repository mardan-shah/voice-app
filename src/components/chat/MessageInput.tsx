"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
    <div className="flex items-center gap-2">
      <Input
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
      />
      <Button onClick={() => void submit()} disabled={disabled || !value.trim()}>
        Send
      </Button>
    </div>
  );
}
