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
      
      // If no voice explicitly selected, pick a matching one for the language (prefer female)
      const baseLang = (l: string) => (l || '').toLowerCase().replace('_','-').split('-')[0];
      if (!selectedVoice) {
        const prefLangCode = baseLang(preferences.stt_language);
        const matchingVoices = voices.filter(v => baseLang(v.lang) === prefLangCode);
        if (matchingVoices.length > 0) {
          // Helper to check if voice is female
          const isFemaleVoice = (voice: SpeechSynthesisVoice) => {
            const name = voice.name.toLowerCase();
            return name.includes('female') || 
                   name.includes('woman') ||
                   name.includes('zira') ||
                   name.includes('samantha') ||
                   name.includes('victoria') ||
                   name.includes('kate') ||
                   name.includes('helena') ||
                   name.includes('steffi') ||
                   name.includes('laura') ||
                   name.includes('amelie') ||
                   name.includes('anna');
          };
          
          // Prefer female voices
          const femaleVoices = matchingVoices.filter(isFemaleVoice);
          if (femaleVoices.length > 0) {
            selectedVoice = femaleVoices.find(v => v.name.toLowerCase().includes('google')) ||
                           femaleVoices.find(v => v.name.toLowerCase().includes('microsoft')) ||
                           femaleVoices.find(v => v.name.toLowerCase().includes('apple')) ||
                           femaleVoices[0];
          } else {
            // Fallback to any voice
            selectedVoice = matchingVoices.find(v => v.name.toLowerCase().includes('google')) ||
                           matchingVoices.find(v => v.name.toLowerCase().includes('microsoft')) ||
                           matchingVoices.find(v => v.name.toLowerCase().includes('apple')) ||
                           matchingVoices[0];
          }
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
