import { useState, useCallback, useEffect } from 'react';
import { useUserPreferences } from './useUserPreferences';
import { useAIConsent } from './useAIConsent';
// BOOTSTRAP-FRONTEND-TTS-POLLY: the `supabase` client import is gone with the
// two `functions.invoke('google-*-tts')` calls it existed for. Cloud speech now
// goes through the gateway's Polly-first route.
import { synthesizeViaGateway } from '@/lib/gateway-tts';

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

      // BOOTSTRAP-FRONTEND-TTS-POLLY — the two voice maps that used to live
      // here are gone, along with the branching that chose between them.
      //
      // They named Google voice ids ('de-DE-Chirp3-HD-Achernar',
      // 'sr-RS-Standard-B', …) and fed two Supabase edge functions that call
      // Google Cloud — decommissioned 2026-08-16. Every cloud-TTS request from
      // this hook has failed since.
      //
      // The gateway resolves the voice from the LANGUAGE (Polly-first,
      // VTID-03495), so the client no longer names a voice at all. That is the
      // point: a provider-specific id on the client is what turns the next
      // provider switch into a per-user data migration instead of a config
      // change (CLAUDE.md §2c), and VTID-03671 already stopped writing them.
      //
      // `preferences.tts_voice` is therefore deliberately NOT read here. Any
      // value still stored on a profile is a Google id naming a voice nothing
      // can play; honouring it would resurrect the outage this fixes. It stays
      // in the schema because VTID-03671 clears it lazily on language change.

      // Browser speech synthesis — the fallback for three distinct cases:
      // no AI consent, a language the gateway cannot serve (Serbian has no
      // Polly voice in any engine), and a transport failure. Defined once
      // because it previously appeared verbatim twice and this change would
      // have made it three copies.
      const speakInBrowser = (why: string) => {
        console.log(`[TTS] browser speech synthesis — ${why}`);
        if (!isSupported) {
          setIsSpeaking(false);
          options?.onError?.(new Error('Speech synthesis is not available'));
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = preferences.tts_speed || 1.0;
        utterance.pitch = preferences.tts_pitch || 1.0;
        utterance.volume = preferences.tts_volume / 100;
        utterance.lang = sttLanguage;

        // `tts_voice` selects WHICH browser voice the fallback uses. This is
        // the one place it is still read, and it is what keeps the settings
        // panel's preview honest: the panel previews the gateway first and
        // this same browser voice second, matching what actually happens here.
        // A stored Google id simply will not match any installed voice, so it
        // is ignored rather than needing a special case.
        const preferredVoiceName = preferences.tts_voice;
        if (preferredVoiceName) {
          const match = window.speechSynthesis
            .getVoices()
            .find((v) => v.name === preferredVoiceName);
          if (match) {
            utterance.voice = match;
            utterance.lang = match.lang;
          }
        }

        utterance.onend = () => {
          setIsSpeaking(false);
          options?.onEnd?.();
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          options?.onError?.(new Error('Speech synthesis failed'));
        };

        window.speechSynthesis.speak(utterance);
      };

      // If no AI consent, skip cloud TTS entirely.
      if (!hasConsent) {
        speakInBrowser('no AI consent');
        return;
      }

      // BOOTSTRAP-FRONTEND-TTS-POLLY — one gateway call replaces the two
      // Google edge-function branches that used to live here.
      //
      // The gateway is the single authority on what can be synthesized: it
      // runs Polly-first and resolves the voice from the language. A null
      // result means "not servable" (Serbian today — Polly has no Serbian
      // voice in any engine) and is an ordinary outcome, not an error, so it
      // degrades to browser speech rather than throwing.
      const cloud = await synthesizeViaGateway(text, sttLanguage);

      if (!cloud) {
        speakInBrowser(`gateway cannot serve ${sttLanguage}`);
        return;
      }

      console.log('[TTS] gateway:', cloud.voiceType, cloud.voice, 'lang=', sttLanguage);

      // MIME comes from the response, never hardcoded — the gateway chooses
      // the format, and assuming it is the bug class that played 16kHz PCM
      // 1.5x fast when 24kHz was assumed (CLAUDE.md §2c).
      const audio = new Audio(`data:${cloud.mime};base64,${cloud.audioB64}`);
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
