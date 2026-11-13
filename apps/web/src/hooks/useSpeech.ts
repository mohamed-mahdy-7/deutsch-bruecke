import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

/* ------------------------------------------------------------------ */
/* Text-to-speech (German)                                             */
/* ------------------------------------------------------------------ */

function pickGermanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "de-de") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("de")) ??
    null
  );
}

/**
 * One hook for both targets: the Capacitor TTS plugin on Android/iOS and the
 * Web Speech API in the browser. The rest of the app only knows speak/cancel.
 */
export function useSpeechSynthesis() {
  const native = Capacitor.isNativePlatform();
  const supported =
    native ||
    (typeof window !== "undefined" && "speechSynthesis" in window);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      if (native) {
        void TextToSpeech.stop().catch(() => undefined);
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [native]);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    if (native) {
      void TextToSpeech.stop().catch(() => undefined);
      setSpeaking(false);
      return;
    }
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [native, supported]);

  const speak = useCallback(
    (text: string, options?: { rate?: number; pitch?: number }) => {
      if (!supported || !text.trim()) return false;

      if (native) {
        const token = tokenRef.current + 1;
        tokenRef.current = token;
        void (async () => {
          try {
            await TextToSpeech.stop();
            if (tokenRef.current !== token) return;
            setSpeaking(true);
            await TextToSpeech.speak({
              text,
              lang: "de-DE",
              rate: options?.rate ?? 0.92,
              pitch: options?.pitch ?? 1,
              volume: 1,
              category: "playback",
            });
          } catch {
            // A missing German voice or an interrupted utterance should never
            // crash a lesson; the UI simply returns to the idle state.
          } finally {
            if (tokenRef.current === token) setSpeaking(false);
          }
        })();
        return true;
      }

      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      utterance.rate = options?.rate ?? 0.92;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = 1;

      const voice = pickGermanVoice(synth.getVoices());
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      synth.speak(utterance);
      setSpeaking(true);
      return true;
    },
    [native, supported],
  );

  return { supported, speaking, speak, cancel };
}

/* ------------------------------------------------------------------ */
/* Speech-to-text (German)                                             */
/* ------------------------------------------------------------------ */

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

function getRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechRecognitionWindow;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

export interface UseSpeechRecognitionOptions {
  language?: string;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (code: string) => void;
}

/**
 * Small wrapper around the Web Speech API and the native Capacitor plugin.
 * Recognition is single-shot, which suits chat dictation and phrase practice:
 * the learner speaks one German message and edits it.
 */
export function useSpeechRecognition({
  language = "de-DE",
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const native = Capacitor.isNativePlatform();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastPartialRef = useRef("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean>(
    () => native || getRecognitionConstructor() !== null,
  );
  const callbacksRef = useRef({ onTranscript, onError });
  callbacksRef.current = { onTranscript, onError };

  // The native plugin can report that speech recognition is unavailable (for
  // example, a device without a speech service). Trust that answer.
  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    void SpeechRecognition.available()
      .then(({ available }) => {
        if (!cancelled) setSupported(available);
      })
      .catch(() => {
        if (!cancelled) setSupported(false);
      });
    return () => {
      cancelled = true;
    };
  }, [native]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (native) {
        void SpeechRecognition.stop().catch(() => undefined);
        void SpeechRecognition.removeAllListeners().catch(() => undefined);
      }
    };
  }, [native]);

  const stop = useCallback(() => {
    if (native) {
      void SpeechRecognition.stop().catch(() => undefined);
      setListening(false);
      return;
    }
    recognitionRef.current?.stop();
    setListening(false);
  }, [native]);

  const start = useCallback(async () => {
    if (native) {
      try {
        const permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== "granted") {
          const requested = await SpeechRecognition.requestPermissions();
          if (requested.speechRecognition !== "granted") {
            callbacksRef.current.onError?.("not-allowed");
            return false;
          }
        }

        await SpeechRecognition.removeAllListeners();
        lastPartialRef.current = "";
        await SpeechRecognition.addListener("partialResults", (data) => {
          const text = (data.matches[0] ?? "").trim();
          if (!text) return;
          lastPartialRef.current = text;
          callbacksRef.current.onTranscript?.(text, false);
        });
        await SpeechRecognition.addListener("listeningState", (data) => {
          if (data.status !== "stopped") return;
          setListening(false);
          const text = lastPartialRef.current.trim();
          if (text) callbacksRef.current.onTranscript?.(text, true);
        });

        setListening(true);
        await SpeechRecognition.start({
          language,
          maxResults: 3,
          partialResults: true,
          popup: false,
        });
        return true;
      } catch {
        setListening(false);
        callbacksRef.current.onError?.("start_failed");
        return false;
      }
    }

    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      callbacksRef.current.onError?.("unsupported");
      return false;
    }

    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let combined = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        combined += result[0]?.transcript ?? "";
      }
      const lastIndex = event.results.length - 1;
      const isFinal =
        lastIndex >= 0 ? Boolean(event.results[lastIndex]?.isFinal) : false;
      callbacksRef.current.onTranscript?.(combined.trim(), isFinal);
    };

    recognition.onerror = (event) => {
      setListening(false);
      callbacksRef.current.onError?.(event.error);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      return true;
    } catch {
      setListening(false);
      callbacksRef.current.onError?.("start_failed");
      return false;
    }
  }, [language, native]);

  return { supported, listening, start, stop };
}
