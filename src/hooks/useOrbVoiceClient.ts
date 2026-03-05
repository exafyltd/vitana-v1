import { useState, useCallback, useRef, useEffect } from 'react';
import { OrbVoiceClient, OrbVoiceClientConfig } from '@/lib/OrbVoiceClient';
import { useAuth } from '@/context/AuthProvider';
import { useTenant } from '@/hooks/useTenant';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

type ConnectionState = 'disconnected' | 'connecting' | 'ready';

interface UseOrbVoiceClientReturn {
  connectionState: ConnectionState;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  error: string | null;
  volumeLevel: number;
  transcript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendMessage: (text: string) => void;
  endTurn: () => void;
}

/**
 * Derive the 2-letter ORB lang code from the full BCP-47 locale.
 * e.g. "de-DE" → "de", "en-US" → "en", "zh-CN" → "zh"
 */
function localeToOrbLang(locale: string): string {
  const base = locale.split('-')[0].toLowerCase();
  return base || 'de'; // fallback to German
}

export function useOrbVoiceClient(): UseOrbVoiceClientReturn {
  const { user } = useAuth();
  const { activeTenantId, setTenantBySlug } = useTenant();
  const { selectedLanguage } = useLanguage();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState('');

  const clientRef = useRef<OrbVoiceClient | null>(null);
  
  // Use refs for stable callback identities
  const connectRef = useRef<() => Promise<void>>();
  const disconnectRef = useRef<() => void>();
  const startListeningRef = useRef<() => Promise<void>>();
  const stopListeningRef = useRef<() => void>();
  const sendMessageRef = useRef<(text: string) => void>();
  const endTurnRef = useRef<() => void>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stop();
        clientRef.current = null;
      }
    };
  }, []);

  connectRef.current = async () => {
    try {
      // SESSION GUARD: Prevent duplicate sessions
      if (clientRef.current) {
        console.log('[useOrbVoiceClient] Session already active, ignoring connect');
        return;
      }

      setError(null);
      setConnectionState('connecting');

      // 1. Validate user is authenticated
      if (!user?.id) {
        setError('Please sign in to use voice features');
        setConnectionState('disconnected');
        return;
      }

      // 2. Get fresh access token
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession?.access_token) {
        setError('Session expired - please sign in again');
        setConnectionState('disconnected');
        return;
      }

      // 3. Check tenant context - try auto-selecting if needed
      let accessToken = freshSession.access_token;

      if (!activeTenantId) {
        const storedSlug = localStorage.getItem('tenant_slug');
        
        if (storedSlug) {
          console.log('[useOrbVoiceClient] Auto-selecting tenant from localStorage:', storedSlug);
          await setTenantBySlug(storedSlug);
          
          const { data: { session: updatedSession } } = await supabase.auth.getSession();
          if (!updatedSession?.access_token) {
            setError('Failed to refresh session after tenant selection');
            setConnectionState('disconnected');
            return;
          }
          accessToken = updatedSession.access_token;
        } else {
          setError('Please select a community first');
          setConnectionState('disconnected');
          return;
        }
      }

      // 4. Derive ORB lang from user's language preference
      const orbLang = localeToOrbLang(selectedLanguage);
      console.log('[useOrbVoiceClient] Using language:', selectedLanguage, '→ ORB lang:', orbLang);

      // 5. Create config for OrbVoiceClient
      const config: OrbVoiceClientConfig = {
        lang: orbLang,
        accessToken: accessToken,
      };

      // 6. Create new client with callbacks
      const client = new OrbVoiceClient(config, {
        onConnectionStateChange: (state) => {
          setConnectionState(state);
        },
        onListeningChange: (listening) => {
          setIsListening(listening);
        },
        onSpeakingChange: (speaking) => {
          setIsSpeaking(speaking);
        },
        onProcessingChange: (processing) => {
          setIsProcessing(processing);
        },
        onTranscript: (text) => {
          setTranscript(text);
        },
        onError: (err) => {
          setError(err);
        },
        onVolumeChange: (volume) => {
          setVolumeLevel(volume);
        },
      });

      clientRef.current = client;
      await client.start();
    } catch (err: any) {
      console.error('[useOrbVoiceClient] Connect error:', err);
      setError(err.message || 'Failed to connect');
      setConnectionState('disconnected');
      // Ensure clientRef is cleaned up on failure
      clientRef.current = null;
    }
  };

  disconnectRef.current = () => {
    // Set disconnected FIRST to prevent auto-resume race condition
    setConnectionState('disconnected');
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setVolumeLevel(0);
  };

  startListeningRef.current = async () => {
    if (clientRef.current) {
      await clientRef.current.startListening();
    }
  };

  stopListeningRef.current = () => {
    if (clientRef.current) {
      clientRef.current.stopListening();
    }
  };

  sendMessageRef.current = (text: string) => {
    if (clientRef.current && text.trim()) {
      clientRef.current.sendTextMessage(text);
    }
  };

  endTurnRef.current = () => {
    if (clientRef.current) {
      clientRef.current.endTurn();
    }
  };

  // Stable function references that never change identity
  const connect = useCallback(() => connectRef.current!(), []);
  const disconnect = useCallback(() => disconnectRef.current!(), []);
  const startListening = useCallback(() => startListeningRef.current!(), []);
  const stopListening = useCallback(() => stopListeningRef.current!(), []);
  const sendMessage = useCallback((text: string) => sendMessageRef.current!(text), []);
  const endTurn = useCallback(() => endTurnRef.current!(), []);

  return {
    connectionState,
    isListening,
    isProcessing,
    isSpeaking,
    error,
    volumeLevel,
    transcript,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
    endTurn,
  };
}
