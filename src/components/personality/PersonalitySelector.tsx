"use client";

import type { AISettings } from "@/types";

import { Card } from "@/components/ui/Card";

type PersonalitySelectorProps = {
  current: AISettings;
  onChoosePreset: (settings: Partial<AISettings>) => void;
};

const presets: Array<{ name: string; values: Partial<AISettings>; description: string }> = [
  {
    name: "Friendly Helper",
    description: "Warm and supportive, good for daily chats.",
    values: { personalityName: "Friendly Helper", humor: "light", tone: "warm", formality: "casual" },
  },
  {
    name: "Tech Expert",
    description: "Precise and technical for coding/problem solving.",
    values: { personalityName: "Tech Expert", humor: "none", tone: "professional", formality: "formal" },
  },
  {
    name: "Creative Companion",
    description: "Playful and imaginative for brainstorming.",
    values: { personalityName: "Creative Companion", humor: "high", tone: "playful", formality: "casual" },
  },
];

export function PersonalitySelector({ current, onChoosePreset }: PersonalitySelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {presets.map((preset) => {
        const active = current.personalityName === preset.values.personalityName;
        return (
          <button key={preset.name} type="button" onClick={() => onChoosePreset(preset.values)} className="text-left">
            <Card className={active ? "border-blue-500 ring-1 ring-blue-500" : ""}>
              <h3 className="font-semibold">{preset.name}</h3>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{preset.description}</p>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
