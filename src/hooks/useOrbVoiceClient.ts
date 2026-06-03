import { useState, useCallback, useRef, useEffect } from 'react';
import { OrbVoiceClient, OrbVoiceClientConfig } from '@/lib/OrbVoiceClient';
import { useAuth } from '@/context/AuthProvider';
import { useTenant } from '@/hooks/useTenant';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playInstantGreeting, preloadInstantGreeting } from '@/lib/instantGreeting';
// VTID-02919 (B0d.4-frontend): capture the wake-click timestamp inside
// the user-gesture call stack so the wake-timeline can compute
// time_to_first_audio_ms accurately.
import { captureWakeClickedAt } from '@/lib/wakeTimelineClient';
import { getOrCreateUnlockedAudioContext } from '@/lib/iosAudioUnlock';
import { lookup } from '@/lib/i18n-toast';

type ConnectionState = 'disconnected' | 'connecting' | 'ready';

interface UseOrbVoiceClientReturn {
  connectionState: ConnectionState;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isReconnecting: boolean;
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
 */
function localeToOrbLang(locale: string): string {
  const base = locale.split('-')[0].toLowerCase();
  return base || 'de';
}

/** Persist an ORB message turn to ai_messages (fire-and-forget). */
async function logOrbMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  try {
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role,
      content,
      input_method: 'voice',
      metadata: { channel: 'orb' },
    });
  } catch (e) {
    console.warn('[useOrbVoiceClient] Failed to log message:', e);
  }
}

export function useOrbVoiceClient(): UseOrbVoiceClientReturn {
  const { user } = useAuth();
  const { activeTenantId, setTenantBySlug } = useTenant();
  const { selectedLanguage } = useLanguage();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState('');

  const clientRef = useRef<OrbVoiceClient | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  
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

  // BOOTSTRAP-ORB-INSTANT: Pre-warm the instant-greeting audio buffer for the
  // current language so tapping the orb plays instantly without a fetch round trip.
  useEffect(() => {
    preloadInstantGreeting(localeToOrbLang(selectedLanguage)).catch(() => {});
  }, [selectedLanguage]);

  connectRef.current = async () => {
    try {
      // SESSION GUARD: Prevent duplicate sessions
      if (clientRef.current) {
        console.log('[useOrbVoiceClient] Session already active, ignoring connect');
        return;
      }

      // BOOTSTRAP-ORB-IOS-UNLOCK: Create + unlock the shared AudioContext
      // SYNCHRONOUSLY here, before any await. The connect flow below has 4+
      // awaits (auth.getSession, setTenantBySlug, buildOrbContext, conversation
      // insert) before client.start() ever runs — by then iOS has consumed
      // the gesture, so unlocking later silently fails and the ORB context
      // stays suspended. Doing it here against the live tap gesture is the
      // only reliable way for iOS Safari / WKWebView. OrbVoiceClient picks
      // up the same shared instance so PCM playback uses an unlocked context.
      getOrCreateUnlockedAudioContext();

      // VTID-02919 (B0d.4-frontend): capture the wake-click timestamp
      // SYNCHRONOUSLY inside the user-gesture handler. OrbVoiceClient
      // will POST `wake_clicked` to the gateway after session-start
      // returns, using THIS timestamp as the `at` field. Accurate
      // time_to_first_audio_ms depends on capturing this before any
      // await downstream.
      captureWakeClickedAt();

      // BOOTSTRAP-ORB-INSTANT: Fire the instant greeting SYNCHRONOUSLY inside the
      // user-gesture call stack, before any await. The real Gemini greeting still
      // takes 4–5s to arrive (context build + WS handshake + TTS); this bridges
      // that gap so the user hears something the moment they tap.
      playInstantGreeting(localeToOrbLang(selectedLanguage));

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

      // 5. Resolve the persistence conversation id OFF the critical path.
      //    Previously this hook (a) built a full memory-garden + diary context
      //    string via buildOrbContext and (b) awaited an ai_conversations
      //    INSERT *before* OrbVoiceClient.start() ever ran — adding several
      //    sequential Supabase round-trips to the tap→speech path. The gateway
      //    already personalises the live system instruction from the user's
      //    memory at session start (bootstrap context pack), so the frontend
      //    context injection was redundant; and the conversation row is only
      //    needed later for transcript logging, not for connecting. Both now
      //    run without blocking the session start.
      const convStorageKey = `orb_conversation_id:${user.id}`;
      const storedConvId = conversationIdRef.current || localStorage.getItem(convStorageKey);
      if (storedConvId) {
        conversationIdRef.current = storedConvId;
      } else {
        // Fire-and-forget: create the conversation in parallel with connect.
        // logOrbMessage() reads conversationIdRef.current and no-ops until it
        // resolves, so early turns simply aren't persisted (the first persisted
        // turn is the assistant greeting transcript, which lands seconds later).
        void (async () => {
          try {
            const { data: conv } = await supabase.from('ai_conversations').insert({
              user_id: user.id,
              agent_type: 'wellness',
              metadata: { channel: 'orb' },
            }).select('id').single();
            if (conv) {
              conversationIdRef.current = conv.id;
              localStorage.setItem(convStorageKey, conv.id);
            }
          } catch (e) {
            console.warn('[useOrbVoiceClient] Failed to create conversation:', e);
          }
        })();
      }

      // 6. Create config for OrbVoiceClient. No initialContext: the gateway
      //    owns both personalised context (bootstrap pack) AND the first
      //    spoken words (server-side auto-greet on upstream connect), so the
      //    frontend no longer injects a context turn or a greeting trigger.
      const config: OrbVoiceClientConfig = {
        lang: orbLang,
        accessToken,
      };

      // 8. Create new client with callbacks
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
        onReconnectingChange: (reconnecting) => {
          setIsReconnecting(reconnecting);
        },
        onTranscript: (text) => {
          setTranscript(text);
          // Persist assistant transcript. The conversation id may still be
          // resolving (created fire-and-forget above), so read the ref at
          // call time rather than capturing it in this closure.
          const cid = conversationIdRef.current;
          if (cid && text.trim()) {
            logOrbMessage(cid, 'assistant', text);
          }
        },
        onLink: (url) => {
          console.log('[useOrbVoiceClient] Event link received:', url);
          toast(lookup('toasts.hooks.linkAvailable'), {
            description: url,
            action: {
              label: 'Open',
              onClick: () => window.open(url, '_blank'),
            },
            duration: 15000,
          });
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
      clientRef.current = null;
    }
  };

  disconnectRef.current = () => {
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    setConnectionState('disconnected');
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setIsReconnecting(false);
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
      // Persist user text message
      if (conversationIdRef.current) {
        logOrbMessage(conversationIdRef.current, 'user', text);
      }
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
    isReconnecting,
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
