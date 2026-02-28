import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { OrbVoiceClient, OrbVoiceClientConfig } from '@/lib/OrbVoiceClient';
import { useAuth } from '@/context/AuthProvider';
import { useTenant } from '@/hooks/useTenant';
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

export function useOrbVoiceClient(): UseOrbVoiceClientReturn {
  const { user } = useAuth();
  const { activeTenantId, setTenantBySlug } = useTenant();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState('');

  const clientRef = useRef<OrbVoiceClient | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stop();
        clientRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
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
      let currentTenantId = activeTenantId;
      let accessToken = freshSession.access_token;

      if (!currentTenantId) {
        // Try to get stored tenant slug from localStorage (set by TenantDetector)
        const storedSlug = localStorage.getItem('tenant_slug');
        
        if (storedSlug) {
          console.log('[useOrbVoiceClient] Auto-selecting tenant from localStorage:', storedSlug);
          
          // Call setTenantBySlug to update JWT's app_metadata.active_tenant_id
          await setTenantBySlug(storedSlug);
          
          // Re-fetch session to get updated token with tenant context
          const { data: { session: updatedSession } } = await supabase.auth.getSession();
          
          if (!updatedSession?.access_token) {
            setError('Failed to refresh session after tenant selection');
            setConnectionState('disconnected');
            return;
          }
          
          accessToken = updatedSession.access_token;
          
          // Verify tenant was set by checking user metadata
          const updatedTenantId = updatedSession.user?.app_metadata?.active_tenant_id;
          if (!updatedTenantId) {
            console.warn('[useOrbVoiceClient] Tenant selection may not have taken effect yet');
          }
        } else {
          // No stored tenant and no active tenant
          setError('Please select a community first');
          setConnectionState('disconnected');
          return;
        }
      }

      // 4. Create config for OrbVoiceClient
      const config: OrbVoiceClientConfig = {
        lang: 'de', // TODO: derive from profile.preferred_languages or inferred_language
        accessToken: accessToken,
      };

      // 5. Create new client with callbacks
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
    }
  }, [user, activeTenantId, setTenantBySlug]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    setConnectionState('disconnected');
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setVolumeLevel(0);
  }, []);

  const startListening = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.startListening();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopListening();
      // endTurn() intentionally NOT called — muting is a pause, not end-of-turn
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (clientRef.current && text.trim()) {
      clientRef.current.sendTextMessage(text);
    }
  }, []);

  const endTurn = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.endTurn();
    }
  }, []);

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
