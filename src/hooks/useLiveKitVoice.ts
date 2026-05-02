/**
 * VTID-LIVEKIT-FOUNDATION: useLiveKitVoice — sibling of useOrbVoiceClient.
 *
 * Connects to a self-hosted LiveKit room as a participant, publishes the
 * mic, subscribes to the agent's audio + data tracks. Reuses ALL of the
 * iOS audio quirks layer from useOrbVoiceClient (gesture-bound AudioContext
 * unlock, loudspeaker route pin, instant greeting MP3) and emits identical
 * onTranscript / onSpeakingChange / onListeningChange events so the
 * surrounding UI doesn't notice the swap.
 *
 * Skeleton today: the actual livekit-client room.connect() call is stubbed.
 * The hook's API surface, lifecycle, and integration points with the
 * surrounding ORB widget shell match the Vertex sibling so the follow-up
 * PR can drop in the real wiring without touching consumers.
 *
 * Activated only when `useActiveVoiceProvider()` returns 'livekit'. While
 * Vertex is active this hook short-circuits — it never opens a connection,
 * never costs anything.
 *
 * Lands wired into useOrbVoiceWidget.ts in a follow-up PR.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/+$/, "");

export interface LiveKitVoiceState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isReconnecting: boolean;
  activeAgentId: string | null;
  lastError: string | null;
}

export interface LiveKitVoiceCallbacks {
  onTranscript?: (text: string, isUser: boolean) => void;
  onLink?: (url: string, title?: string) => void;
  onError?: (msg: string) => void;
  onConnectionStateChange?: (connected: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
}

interface MintedToken {
  url: string;
  token: string;
  orb_session_id: string;
}

const initialState: LiveKitVoiceState = {
  isConnected: false,
  isListening: false,
  isSpeaking: false,
  isReconnecting: false,
  activeAgentId: null,
  lastError: null,
};

/**
 * Hook contract is identical to useOrbVoiceClient so consumers can swap
 * one for the other based on the active provider.
 */
export function useLiveKitVoice(callbacks: LiveKitVoiceCallbacks = {}) {
  const [state, setState] = useState<LiveKitVoiceState>(initialState);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Mints a LiveKit room JWT via the gateway's /api/v1/orb/livekit/token.
  // Returns null if the server is in standby (active=vertex) — caller falls back.
  const mintToken = useCallback(async (): Promise<MintedToken | null> => {
    if (!GATEWAY_URL) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) return null;

    try {
      const res = await fetch(`${GATEWAY_URL}/orb/livekit/token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lang: navigator.language || "en" }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 503) {
        // Standby — caller should re-resolve active provider and connect
        // to the Vertex pipeline instead.
        return null;
      }
      if (!res.ok) {
        const detail = await res.text();
        callbacksRef.current.onError?.(`token mint failed (${res.status}): ${detail}`);
        return null;
      }
      const body = (await res.json()) as Partial<MintedToken>;
      if (!body.url || !body.token) return null;
      return body as MintedToken;
    } catch (e) {
      callbacksRef.current.onError?.(`token mint network error: ${(e as Error).message}`);
      return null;
    }
  }, []);

  // TODO(VTID-LIVEKIT-FOUNDATION): wire livekit-client.Room.connect() here.
  // The real implementation will:
  //   1. Reuse getOrCreateUnlockedAudioContext() inside the user gesture.
  //   2. Reuse pinIOSLoudspeakerRoute() before getUserMedia.
  //   3. Reuse playInstantGreeting() for the zero-delay UX bridge.
  //   4. await mintToken(); if null, surface a "service standby" hint.
  //   5. new Room().connect(url, token) and publish the mic track.
  //   6. Subscribe to remote audio + data-channel messages for tool calls.
  //   7. Emit onTranscript / onSpeakingChange / onListeningChange identical
  //      to OrbVoiceClient.
  const connect = useCallback(async () => {
    setState((s) => ({ ...s, lastError: "useLiveKitVoice is a skeleton; full wiring lands in follow-up PR." }));
    callbacksRef.current.onError?.("useLiveKitVoice not yet implemented");
  }, []);

  const disconnect = useCallback(() => {
    setState(initialState);
    callbacksRef.current.onConnectionStateChange?.(false);
  }, []);

  const sendMessage = useCallback(async (_text: string) => {
    callbacksRef.current.onError?.("useLiveKitVoice.sendMessage not yet implemented");
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      // Real impl: room.disconnect() and free AudioContext refcounts.
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    mintToken,
  };
}
