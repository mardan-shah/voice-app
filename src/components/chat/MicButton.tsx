"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useVoice } from "@/hooks/useVoice";
import { cn } from "@/lib/utils";

type MicButtonProps = {
  onTranscript: (transcript: string) => Promise<void>;
};

export function MicButton({ onTranscript }: MicButtonProps) {
  const { supported, isListening, startListening, stopListening } = useVoice();
  const [error, setError] = useState<string | null>(null);

  if (!supported) {
    return <span className="text-xs text-zinc-500">Microphone not supported in this browser</span>;
  }

  const handleClick = async () => {
    setError(null);

    if (isListening) {
      stopListening();
      return;
    }

    try {
      const transcript = await startListening();
      if (transcript) {
        await onTranscript(transcript);
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Voice input failed.";
      setError(message);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={isListening ? "danger" : "secondary"}
        className={cn(isListening ? "animate-pulse" : "")}
        onClick={() => void handleClick()}
      >
        {isListening ? "Listening..." : "Mic"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
