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
      
      const voiceId = preferences.tts_voice || 'EXAVITQu4vr4xnSDxMaL';

      console.log('[TTS] ElevenLabs: voice=', voiceId);
      
      const body = {
        text,
        voiceId,
        modelId: 'eleven_turbo_v2_5',
      };

      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', { body });

      if (error) throw error;
      if (!data?.audioContent) throw new Error('No audio content received');

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
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
