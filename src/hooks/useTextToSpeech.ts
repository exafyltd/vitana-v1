import { useState, useCallback, useEffect } from 'react';
import { useUserPreferences } from './useUserPreferences';

export interface TTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useTextToSpeech() {
  const { preferences } = useUserPreferences();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => 'speechSynthesis' in window);

  useEffect(() => {
    if (!isSupported) return;

    const handleEnd = () => setIsSpeaking(false);
    window.speechSynthesis.addEventListener('end', handleEnd);

    return () => {
      window.speechSynthesis.removeEventListener('end', handleEnd);
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback((text: string, options?: TTSOptions) => {
    if (!isSupported || !preferences) {
      options?.onError?.(new Error('Text-to-speech is not supported in this browser'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply user preferences
      utterance.rate = preferences.tts_speed;
      utterance.pitch = preferences.tts_pitch;
      utterance.volume = preferences.tts_volume / 100;
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = voices.find(v => v.name === preferences.tts_voice);
      
      // Self-healing: if selected voice doesn't match language, find a better one
      if (selectedVoice) {
        const voiceLangCode = selectedVoice.lang.split('-')[0];
        const prefLangCode = preferences.stt_language.split('-')[0];
        
        if (voiceLangCode !== prefLangCode) {
          // Voice language mismatch - find a matching voice
          const matchingVoices = voices.filter(v => v.lang.split('-')[0] === prefLangCode);
          if (matchingVoices.length > 0) {
            // Prefer Google > Microsoft > Apple > first
            selectedVoice = matchingVoices.find(v => v.name.toLowerCase().includes('google')) ||
                           matchingVoices.find(v => v.name.toLowerCase().includes('microsoft')) ||
                           matchingVoices.find(v => v.name.toLowerCase().includes('apple')) ||
                           matchingVoices[0];
          }
        }
      } else {
        // No voice selected - pick a preferred one for the language
        const prefLangCode = preferences.stt_language.split('-')[0];
        const matchingVoices = voices.filter(v => v.lang.split('-')[0] === prefLangCode);
        if (matchingVoices.length > 0) {
          selectedVoice = matchingVoices.find(v => v.name.toLowerCase().includes('google')) ||
                         matchingVoices.find(v => v.name.toLowerCase().includes('microsoft')) ||
                         matchingVoices.find(v => v.name.toLowerCase().includes('apple')) ||
                         matchingVoices[0];
        }
      }
      
      // Set voice and CRITICAL: set lang to match the voice's actual language
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = preferences.stt_language || 'en-US';
      }
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        options?.onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        options?.onEnd?.();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        options?.onError?.(new Error(event.error));
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      setIsSpeaking(false);
      options?.onError?.(error as Error);
    }
  }, [preferences, isSupported]);

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    cancel,
    isSpeaking,
    isSupported,
  };
}
