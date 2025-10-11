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

    // Cancel any ongoing speech
    if (isSupported) {
      window.speechSynthesis.cancel();
    }

    try {
      const voiceName = preferences.tts_voice;
      const isCloudVoice = voiceName?.includes('-Standard-') || voiceName?.includes('-Wavenet-');

      console.log('🎤 TTS - Voice:', voiceName, 'isCloud:', isCloudVoice);

      if (isCloudVoice) {
        // Use Google Cloud TTS
        setIsSpeaking(true);
        options?.onStart?.();

        const { data, error } = await supabase.functions.invoke('google-cloud-tts', {
          body: {
            text,
            voiceId: voiceName,
            languageCode: preferences.stt_language || 'en-US',
          },
        });

        if (error) throw error;
        if (!data?.audioContent) throw new Error('No audio content received');

        // Play the audio
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
        console.log('✅ Cloud TTS playing');
      } else {
        // Use browser TTS
        if (!isSupported) {
          throw new Error('Text-to-speech is not supported in this browser');
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.rate = preferences.tts_speed;
        utterance.pitch = preferences.tts_pitch;
        utterance.volume = preferences.tts_volume / 100;
        
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.name === voiceName);
        
        console.log('🎤 TTS - Selected voice from prefs:', voiceName);
        console.log('🎤 TTS - Found voice:', selectedVoice ? { name: selectedVoice.name, lang: selectedVoice.lang } : 'NOT FOUND');
        
        const baseLang = (l: string) => (l || '').toLowerCase().replace('_','-').split('-')[0];
        if (!selectedVoice) {
          const prefLangCode = baseLang(preferences.stt_language);
          const matchingVoices = voices.filter(v => baseLang(v.lang) === prefLangCode);
          if (matchingVoices.length > 0) {
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
            
            const femaleVoices = matchingVoices.filter(isFemaleVoice);
            if (femaleVoices.length > 0) {
              selectedVoice = femaleVoices.find(v => v.name.toLowerCase().includes('google')) ||
                             femaleVoices.find(v => v.name.toLowerCase().includes('microsoft')) ||
                             femaleVoices.find(v => v.name.toLowerCase().includes('apple')) ||
                             femaleVoices[0];
            } else {
              selectedVoice = matchingVoices.find(v => v.name.toLowerCase().includes('google')) ||
                             matchingVoices.find(v => v.name.toLowerCase().includes('microsoft')) ||
                             matchingVoices.find(v => v.name.toLowerCase().includes('apple')) ||
                             matchingVoices[0];
            }
          }
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
          console.log('✅ TTS - Using voice:', selectedVoice.name, 'with lang:', selectedVoice.lang);
        } else {
          utterance.lang = preferences.stt_language || 'en-US';
          console.warn('⚠️ TTS - No voice selected, using fallback lang:', utterance.lang);
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
      }
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
