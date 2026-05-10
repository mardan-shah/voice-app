export class SpeechToTextController {
  private recognition: SpeechRecognition | null = null;
  private listening = false;

  constructor(private language = "en-US") {
    if (typeof window === "undefined") {
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      return;
    }

    this.recognition = new Recognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = language;
  }

  get supported() {
    return this.recognition !== null;
  }

  get isListening() {
    return this.listening;
  }

  listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("Speech recognition is not supported in this browser."));
        return;
      }

      let finalTranscript = "";
      this.recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          if (event.results[index].isFinal) {
            finalTranscript += event.results[index][0].transcript;
          }
        }
      };

      this.recognition.onend = () => {
        this.listening = false;
        resolve(finalTranscript.trim());
      };

      this.recognition.onerror = (event) => {
        this.listening = false;
        if (event.error === "no-speech") {
          resolve("");
          return;
        }
        reject(new Error(event.error));
      };

      this.listening = true;
      this.recognition.start();
    });
  }

  stop() {
    if (!this.recognition || !this.listening) {
      return;
    }

    this.recognition.stop();
    this.listening = false;
  }
}
