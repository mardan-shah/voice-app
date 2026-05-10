"use client";

import { useCallback, useMemo, useState } from "react";

import { SpeechToTextController } from "@/lib/voice/speechToText";
import { TextToSpeechController } from "@/lib/voice/textToSpeech";
import { useSettingsStore } from "@/store/settingsStore";

export function useVoice() {
  const { voiceSettings } = useSettingsStore();
  const [isListening, setIsListening] = useState(false);

  const speechToText = useMemo(
    () => new SpeechToTextController(voiceSettings.language),
    [voiceSettings.language]
  );
  const textToSpeech = useMemo(() => new TextToSpeechController(), []);

  const startListening = useCallback(async () => {
    setIsListening(true);
    try {
      return await speechToText.listen();
    } finally {
      setIsListening(false);
    }
  }, [speechToText]);

  const stopListening = useCallback(() => {
    speechToText.stop();
    setIsListening(false);
  }, [speechToText]);

  const speak = useCallback(
    async (text: string) => {
      await textToSpeech.speak(text, voiceSettings);
    },
    [textToSpeech, voiceSettings]
  );

  return {
    supported: speechToText.supported,
    isListening,
    isSpeaking: textToSpeech.isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking: () => textToSpeech.stop(),
    voices: textToSpeech.getAvailableVoices(),
  };
}
