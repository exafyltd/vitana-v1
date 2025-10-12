import { useState, useCallback, useEffect } from 'react';
import { useUserPreferences } from './useUserPreferences';
import { supabase } from '@/integrations/supabase/client';

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

  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    if (!preferences) {
      options?.onError?.(new Error('User preferences not loaded'));
      return;
    }

    if (isSupported) window.speechSynthesis.cancel();

    try {
      setIsSpeaking(true);
      options?.onStart?.();
      
      const sttLanguage = preferences.stt_language || 'en-US';
      
      // RULE 6: Fixed Cloud TTS voice map (deterministic)
      const CLOUD_VOICE_MAP: Record<string, string> = {
        'ru-RU': 'ru-RU-Standard-D',
        'sr-RS': 'sr-RS-Standard-B',
        'de-DE': 'de-DE-Neural2-F',
        'fr-FR': 'fr-FR-Neural2-A',
        'es-ES': 'es-ES-Neural2-A',
        'ar-XA': 'ar-XA-Standard-A',
        'zh-CN': 'cmn-CN-Standard-A',
        'en-US': 'en-US-Neural2-F',
        'pt-PT': 'pt-PT-Standard-A'
      };

      const mappedVoice = CLOUD_VOICE_MAP[sttLanguage];
      
      if (!mappedVoice) {
        setIsSpeaking(false);
        throw new Error(`TTS voice unavailable for ${sttLanguage}`);
      }

      console.log('[TTS] RULE: voice=', mappedVoice, 'lang=', sttLanguage);
      
      const { data, error } = await supabase.functions.invoke('google-cloud-tts', {
        body: {
          text,
          voiceId: mappedVoice,
          languageCode: sttLanguage
        }
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error('No audio content received');

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.volume = preferences.tts_volume / 100;
      
      audio.onended = () => {
        setIsSpeaking(false);
        options?.onEnd?.();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        options?.onError?.(new Error('Audio playback failed'));
      };

      await audio.play();
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
