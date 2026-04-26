import { useState, useCallback, useEffect } from 'react';
import { useUserPreferences } from './useUserPreferences';
import { useAIConsent } from './useAIConsent';
import { supabase } from '@/integrations/supabase/client';
import { playAudioBase64 } from '@/lib/playAudioBase64';

export interface TTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useTextToSpeech() {
  const { preferences } = useUserPreferences();
  const { hasConsent } = useAIConsent();
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
      const userVoice = preferences.tts_voice;
      
      // Determine which TTS service to use
      const isSerbian = sttLanguage === 'sr-RS';
      const isChirp3Voice = userVoice?.includes('Chirp3-HD');
      const isGoogleSpeechVoice = userVoice?.includes('-Standard-') || userVoice?.includes('-Wavenet-');
      
      // GEMINI VOICE MAP: For Chirp 3 HD voices
      const GEMINI_VOICE_MAP: Record<string, string> = {
        'en-US': 'en-US-Chirp3-HD-Leda',
        'de-DE': 'de-DE-Chirp3-HD-Achernar',
        'ar-XA': 'ar-XA-Chirp3-HD-Aoede',
        'es-ES': 'es-ES-Chirp3-HD-Gacrux',
        'ru-RU': 'ru-RU-Chirp3-HD-Kore',
        'zh-CN': 'cmn-CN-Chirp3-HD-Leda',
        'cmn-CN': 'cmn-CN-Chirp3-HD-Leda',
        'fr-FR': 'fr-FR-Chirp3-HD-Pulcherrima',
        'pt-PT': 'pt-PT-Chirp3-HD-Zephyr',
        'pl-PL': 'pl-PL-Chirp3-HD-Despina',
      };

      // GOOGLE SPEECH VOICE MAP: Only for Serbian
      const GOOGLE_SPEECH_VOICE_MAP: Record<string, string> = {
        'sr-RS': 'sr-RS-Standard-B',
      };

      // Route to appropriate TTS service
      // If no AI consent, skip cloud TTS and fall back to browser speechSynthesis
      if (!hasConsent) {
        console.log('[TTS] No AI consent — falling back to browser TTS');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = preferences.tts_speed || 1.0;
        utterance.pitch = preferences.tts_pitch || 1.0;
        utterance.volume = preferences.tts_volume / 100;
        utterance.lang = sttLanguage;

        utterance.onend = () => {
          setIsSpeaking(false);
          options?.onEnd?.();
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          options?.onError?.(new Error('Speech synthesis failed'));
        };

        window.speechSynthesis.speak(utterance);
        return;
      }

      if (isChirp3Voice || (!isGoogleSpeechVoice && !isSerbian)) {
        // Use Gemini TTS (Chirp 3 HD)
        const voiceId = isChirp3Voice ? userVoice : GEMINI_VOICE_MAP[sttLanguage];
        
        if (!voiceId) {
          setIsSpeaking(false);
          throw new Error(`Gemini TTS voice unavailable for ${sttLanguage}`);
        }

        console.log('[TTS] Using Gemini Chirp 3 HD:', voiceId, 'lang=', sttLanguage);
        
        const { data, error } = await supabase.functions.invoke('google-gemini-tts', {
          body: {
            text,
            voiceId,
            languageCode: sttLanguage
          }
        });

        if (error) throw error;
        if (!data?.audioContent) throw new Error('No audio content received');

        // Play via Web Audio API instead of HTMLAudioElement so the
        // greeting bypasses the iOS Silent switch (which silences <audio>
        // tags but lets AudioContext through). Same path the streaming
        // ORB response audio uses, so behavior is consistent.
        try {
          await playAudioBase64(data.audioContent, {
            volume: (preferences.tts_volume ?? 100) / 100,
            onEnd: () => {
              setIsSpeaking(false);
              options?.onEnd?.();
            },
          });
        } catch (e) {
          setIsSpeaking(false);
          options?.onError?.(e instanceof Error ? e : new Error('Audio playback failed'));
        }
      } else if (isSerbian || isGoogleSpeechVoice) {
        // Use Google Speech API (only for Serbian or explicitly selected Google Speech voices)
        const voiceId = isGoogleSpeechVoice ? userVoice : GOOGLE_SPEECH_VOICE_MAP[sttLanguage];
        
        if (!voiceId) {
          setIsSpeaking(false);
          throw new Error(`Google Speech voice unavailable for ${sttLanguage}`);
        }

        console.log('[TTS] Using Google Speech API:', voiceId, 'lang=', sttLanguage);
        
        const { data, error } = await supabase.functions.invoke('google-cloud-tts', {
          body: {
            text,
            voiceId,
            languageCode: sttLanguage
          }
        });

        if (error) throw error;
        if (!data?.audioContent) throw new Error('No audio content received');

        try {
          await playAudioBase64(data.audioContent, {
            volume: (preferences.tts_volume ?? 100) / 100,
            onEnd: () => {
              setIsSpeaking(false);
              options?.onEnd?.();
            },
          });
        } catch (e) {
          setIsSpeaking(false);
          options?.onError?.(e instanceof Error ? e : new Error('Audio playback failed'));
        }
      } else {
        // Fallback to browser TTS
        console.log('[TTS] Fallback to browser TTS');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = preferences.tts_speed || 1.0;
        utterance.pitch = preferences.tts_pitch || 1.0;
        utterance.volume = preferences.tts_volume / 100;
        utterance.lang = sttLanguage;
        
        utterance.onend = () => {
          setIsSpeaking(false);
          options?.onEnd?.();
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
          options?.onError?.(new Error('Speech synthesis failed'));
        };
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      setIsSpeaking(false);
      options?.onError?.(error as Error);
    }
  }, [preferences, isSupported, hasConsent]);

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
