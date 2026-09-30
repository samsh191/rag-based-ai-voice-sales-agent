import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin wrapper around the browser's SpeechRecognition API (Chrome, Edge, Safari 14.1+).
 * Returns interim + final transcript text and start/stop controls.
 */
export function useSpeechRecognition({ onFinalResult } = {}) {
  const [isSupported] = useState(
    () => typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  // Tracks whether a proper "final" result already fired this listening session, and the
  // latest interim text seen, so onend can fall back to using it - see note below.
  const gotFinalRef = useRef(false);
  const latestInterimRef = useRef("");

  useEffect(() => {
    if (!isSupported) return;
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        gotFinalRef.current = true;
        latestInterimRef.current = "";
        setInterimText("");
        onFinalResultRef.current?.(final.trim());
      } else {
        latestInterimRef.current = interim;
        setInterimText(interim);
      }
    };

    recognition.onend = () => {
      setListening(false);
      // Recognition can end (either after a natural pause, or because the person clicked
      // Stop mid-sentence) without ever firing a "final" result - many browsers don't
      // finalize on a manual stop(). If we captured interim speech but never got a final
      // result for it, treat that interim text as the answer instead of silently dropping
      // whatever the person just said.
      const leftover = latestInterimRef.current.trim();
      if (!gotFinalRef.current && leftover) {
        latestInterimRef.current = "";
        setInterimText("");
        onFinalResultRef.current?.(leftover);
      }
      gotFinalRef.current = false;
    };
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [isSupported]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    gotFinalRef.current = false;
    latestInterimRef.current = "";
    setInterimText("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // start() throws if already started - ignore
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { isSupported: !!isSupported, listening, interimText, start, stop };
}
