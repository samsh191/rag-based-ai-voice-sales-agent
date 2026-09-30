import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wrapper around window.speechSynthesis. Picks a natural-sounding English voice
 * when available and reports speaking state so the UI can animate the avatar.
 */
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /Samantha|Google US English|Jenny|Aria/i.test(v.name)) ||
        voices.find((v) => v.lang === "en-US" && /female/i.test(v.name)) ||
        voices.find((v) => v.lang?.startsWith("en")) ||
        voices[0];
      voiceRef.current = preferred || null;
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }, []);

  const speak = useCallback((text, { onEnd } = {}) => {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 1.02;
    utterance.pitch = 1.05;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, cancel, speaking };
}
