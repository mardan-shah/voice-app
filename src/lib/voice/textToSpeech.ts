import { createClient } from "@/lib/supabase/client";
import type { VoiceSettings } from "@/types";

export class TextToSpeechController {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private pendingResolve: (() => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;
  private speaking = false;
  private synth: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window === "undefined") {
      return;
    }

    this.audio = new Audio();
    this.synth = window.speechSynthesis;
  }

  getAvailableVoices() {
    return this.synth?.getVoices() ?? [];
  }

  get isSpeaking() {
    return this.speaking;
  }

  stop() {
    if (this.pendingResolve) {
      this.pendingResolve();
    }
    this.pendingResolve = null;
    this.pendingReject = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.onended = null;
      this.audio.onerror = null;
    }
    this.synth?.cancel();
    this.speaking = false;
    this.revokeObjectUrl();
  }

  async speak(text: string, settings: VoiceSettings): Promise<void> {
    if (!this.audio) {
      throw new Error("Voice output is not available in this environment.");
    }

    this.stop();
    const cleanText = text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/\n/g, ". ");

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sign in before using voice output.");
    }

    const response = await fetch("/api/voice/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text: cleanText, settings }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (isElevenLabsFreePlanVoiceError(errorText)) {
        return this.speakWithBrowser(cleanText, settings);
      }
      throw new Error(`Voice output failed: ${response.status} ${errorText}`);
    }

    const blob = await response.blob();
    this.objectUrl = URL.createObjectURL(blob);
    this.audio.src = this.objectUrl;
    this.audio.volume = settings.volume;
    this.speaking = true;

    await new Promise<void>((resolve, reject) => {
      if (!this.audio) {
        reject(new Error("Voice output is not available in this environment."));
        return;
      }

      this.audio.onended = () => {
        this.speaking = false;
        this.pendingResolve = null;
        this.pendingReject = null;
        this.revokeObjectUrl();
        resolve();
      };
      this.audio.onerror = () => {
        this.speaking = false;
        this.pendingResolve = null;
        this.pendingReject = null;
        this.revokeObjectUrl();
        reject(new Error("Audio playback failed."));
      };
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      void this.audio.play().catch((error: unknown) => {
        this.speaking = false;
        this.pendingResolve = null;
        this.pendingReject = null;
        this.revokeObjectUrl();
        if (isPlaybackInterruption(error)) {
          resolve();
          return;
        }
        reject(error instanceof Error ? error : new Error("Audio playback failed."));
      });
    });
  }

  private revokeObjectUrl() {
    if (!this.objectUrl) {
      return;
    }
    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }

  private speakWithBrowser(text: string, settings: VoiceSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error("ElevenLabs rejected this voice and browser speech output is unavailable."));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.language;
      utterance.pitch = settings.pitch;
      utterance.rate = settings.speed || settings.rate;
      utterance.volume = settings.volume;

      this.speaking = true;
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      utterance.onend = () => {
        this.speaking = false;
        this.pendingResolve = null;
        this.pendingReject = null;
        resolve();
      };
      utterance.onerror = (event) => {
        this.speaking = false;
        this.pendingResolve = null;
        this.pendingReject = null;
        if (isPlaybackInterruption(event.error)) {
          resolve();
          return;
        }
        reject(new Error(event.error));
      };

      this.synth.cancel();
      this.synth.speak(utterance);
    });
  }
}

function isElevenLabsFreePlanVoiceError(errorText: string) {
  return (
    errorText.includes("paid_plan_required") ||
    errorText.includes("Free users cannot use library voices") ||
    errorText.includes("payment_required")
  );
}

function isPlaybackInterruption(error: unknown) {
  const message =
    typeof error === "string" ? error : error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();
  return (
    normalized.includes("interrupted") ||
    normalized.includes("media was removed") ||
    normalized.includes("aborted") ||
    normalized.includes("canceled") ||
    normalized.includes("cancelled")
  );
}
