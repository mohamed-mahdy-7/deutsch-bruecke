import { useCallback, useEffect, useRef, useState } from "react";

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

export function useSpeechSynthesis() {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, options?: { rate?: number; pitch?: number }) => {
      if (!supported || !text.trim()) return false;
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
    [supported],
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
 * Small wrapper around the Web Speech API. Recognition is single-shot, which
 * suits chat dictation: the learner speaks one German message and edits it.
 */
export function useSpeechRecognition({
  language = "de-DE",
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [supported] = useState<boolean>(
    () => getRecognitionConstructor() !== null,
  );
  const callbacksRef = useRef({ onTranscript, onError });
  callbacksRef.current = { onTranscript, onError };

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
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
  }, [language]);

  return { supported, listening, start, stop };
}
