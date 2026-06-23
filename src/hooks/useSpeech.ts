import { useCallback, useEffect, useRef } from 'react';

export const useSpeech = () => {
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        voicesRef.current = voices;
      } catch (e) {
        console.error('Failed to load speech synthesis voices:', e);
      }
    };

    loadVoices();

    // Chrome and Android WebViews load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback((text: string, rate: number = 1.0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis is not supported in this browser.');
      return;
    }

    try {
      // 1. Cancel any active speaking to clear the queue
      window.speechSynthesis.cancel();

      // 2. Prepare the utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;

      // 3. Select a proper English voice
      const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
      
      // Look for en-US first, then any en- voice
      const enVoice = voices.find(v => v.lang === 'en-US' || v.lang.startsWith('en_US')) ||
                      voices.find(v => v.lang.startsWith('en-') || v.lang.startsWith('en_'));
      
      if (enVoice) {
        utterance.voice = enVoice;
      }

      // 4. Android SpeechSynthesis cancel/speak race condition workaround:
      // Calling speak() immediately after cancel() can freeze the TTS queue on WebView/Android Chrome.
      // Introducing a tiny timeout (50ms) ensures the cancel operation clears and speak executes reliably.
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (speakErr) {
          console.error('Error during speak execution:', speakErr);
        }
      }, 50);
    } catch (e) {
      console.error('Error initializing SpeechSynthesisUtterance:', e);
    }
  }, []);

  return speak;
};
