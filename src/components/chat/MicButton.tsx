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

  if (supported === null) {
    return <span className="px-2 text-xs text-slate-400">Checking microphone...</span>;
  }

  if (!supported) {
    return (
      <span className="max-w-48 px-2 text-xs leading-5 text-slate-400" title="Voice input requires Chrome or Edge with microphone permission.">
        Voice input needs Chrome or Edge
      </span>
    );
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
    <div className="flex items-center gap-2">
      <Button
        variant={isListening ? "danger" : "secondary"}
        className={cn("h-11 rounded-xl px-4", isListening ? "animate-pulse" : "")}
        onClick={() => void handleClick()}
      >
        {isListening ? "Listening..." : "Use mic"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
