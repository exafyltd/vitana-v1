import { useState, useCallback, useEffect } from 'react';
import { useUserPreferences, type UserPreferences } from './useUserPreferences';
import { useAIConsent } from './useAIConsent';
import { supabase } from '@/integrations/supabase/client';

// VTID-03651: GCP billing was disabled 2026-08-16. This hook used to call
// two Supabase edge functions (`google-gemini-tts`, `google-cloud-tts`) that
// reach Google Cloud APIs directly — a path the gateway's own TTS provider
// flag (TTS_PROVIDER=polly) never covered, because this hook never went
// through the gateway at all. With GCP dead those two edge functions now
// error on every call, so every user with AI consent enabled got silence
// (no browser-TTS fallback existed on this branch).
//
// Fixed by routing through the gateway's existing Polly-backed
// POST /api/v1/orb/tts (routes/orb-live.ts) instead — it already tries
// Amazon Polly first when TTS_PROVIDER=polly (live in prod) and only reads
// the now-dead Google Cloud TTS client as a fallback that will itself never
// fire. Same pattern as useMarketplace.ts: normalize VITE_GATEWAY_URL to a
// bare origin so this file doesn't need its own env var.
const GATEWAY_URL = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || '').replace(/\/api\/v1\/?$/, '') ||
  ''
).replace(/\/+$/, '');

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** langCode like 'de-DE' / 'sr-RS' -> the gateway's bare 'de' / 'sr'. */
function toGatewayLang(sttLanguage: string): string {
  return (sttLanguage.split('-')[0] || 'en').toLowerCase();
}

export interface TTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

/** The one TTS path with zero external dependencies — used for no-consent
 *  sessions and as the fallback whenever the gateway/Polly call fails. */
function speakViaBrowser(
  text: string,
  preferences: UserPreferences,
  lang: string,
  setIsSpeaking: (v: boolean) => void,
  options?: TTSOptions,
): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = preferences.tts_speed || 1.0;
  utterance.pitch = preferences.tts_pitch || 1.0;
  utterance.volume = preferences.tts_volume / 100;
  utterance.lang = lang;

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

      // Route to appropriate TTS service
      // If no AI consent, skip cloud TTS and fall back to browser speechSynthesis
      if (!hasConsent) {
        console.log('[TTS] No AI consent — falling back to browser TTS');
        speakViaBrowser(text, preferences, sttLanguage, setIsSpeaking, options);
        return;
      }

      if (!GATEWAY_URL) {
        speakViaBrowser(text, preferences, sttLanguage, setIsSpeaking, options);
        return;
      }

      try {
        console.log('[TTS] Requesting gateway TTS (Polly), lang=', sttLanguage);
        const resp = await fetch(`${GATEWAY_URL}/api/v1/orb/tts`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ text, lang: toGatewayLang(sttLanguage) }),
        });
        const data = await resp.json().catch(() => null);
        if (!resp.ok || !data?.ok || !data?.audio_b64) {
          throw new Error(data?.error || `gateway TTS failed (${resp.status})`);
        }

        const audio = new Audio(`data:${data.mime || 'audio/mp3'};base64,${data.audio_b64}`);
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
      } catch (gatewayError) {
        // VTID-03651: never leave the user in silence because the network
        // call failed — degrade to browser TTS same as the no-consent path,
        // rather than surfacing only an onError callback most call sites
        // don't render anything for.
        console.warn('[TTS] Gateway TTS failed, falling back to browser TTS:', (gatewayError as Error).message);
        speakViaBrowser(text, preferences, sttLanguage, setIsSpeaking, options);
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
