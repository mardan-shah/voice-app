"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { SpeechToTextController } from "@/lib/voice/speechToText";
import { TextToSpeechController } from "@/lib/voice/textToSpeech";
import { useSettingsStore } from "@/store/settingsStore";

export function useVoice() {
  const { voiceSettings } = useSettingsStore();
  const [isListening, setIsListening] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const speechToText = useMemo(
    () => (hydrated ? new SpeechToTextController(voiceSettings.language) : null),
    [hydrated, voiceSettings.language]
  );
  const textToSpeech = useMemo(() => (hydrated ? new TextToSpeechController() : null), [hydrated]);

  const startListening = useCallback(async () => {
    if (!speechToText) {
      throw new Error("Microphone is still initializing.");
    }
    setIsListening(true);
    try {
      return await speechToText.listen();
    } finally {
      setIsListening(false);
    }
  }, [speechToText]);

  const stopListening = useCallback(() => {
    speechToText?.stop();
    setIsListening(false);
  }, [speechToText]);

  const speak = useCallback(
    async (text: string) => {
      if (!textToSpeech) {
        throw new Error("Voice output is still initializing.");
      }
      await textToSpeech.speak(text, voiceSettings);
    },
    [textToSpeech, voiceSettings]
  );

  return {
    supported: hydrated ? (speechToText?.supported ?? false) : null,
    isListening,
    isSpeaking: textToSpeech?.isSpeaking ?? false,
    startListening,
    stopListening,
    speak,
    stopSpeaking: () => textToSpeech?.stop(),
    voices: textToSpeech?.getAvailableVoices() ?? [],
  };
}
