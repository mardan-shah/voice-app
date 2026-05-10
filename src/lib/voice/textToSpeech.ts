import type { VoiceSettings } from "@/types";

export class TextToSpeechController {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window === "undefined") {
      return;
    }

    this.synth = window.speechSynthesis;
    const loadVoices = () => {
      this.voices = this.synth?.getVoices() ?? [];
    };

    loadVoices();
    if (this.synth) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getAvailableVoices() {
    return this.voices;
  }

  get isSpeaking() {
    return this.synth?.speaking ?? false;
  }

  stop() {
    this.synth?.cancel();
  }

  speak(text: string, settings: VoiceSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error("Speech synthesis is not supported in this browser."));
        return;
      }

      this.synth.cancel();
      const cleanText = text
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/\n/g, ". ");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = settings.pitch;
      utterance.rate = settings.rate;
      utterance.volume = settings.volume;
      utterance.lang = settings.language;

      if (settings.voiceName) {
        const voice = this.voices.find((item) => item.name === settings.voiceName);
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));
      this.synth.speak(utterance);
    });
  }
}
