/**
 * VTID-LIVEKIT-FOUNDATION: useLiveKitVoice — real Room.connect implementation.
 *
 * Sibling of useOrbVoiceClient. Connects to a self-hosted LiveKit room as a
 * participant, publishes the mic, subscribes to the agent's audio + data
 * tracks. Reuses iOS audio quirks layer from useOrbVoiceClient (gesture-bound
 * AudioContext unlock, loudspeaker route pin, instant greeting MP3).
 *
 * Lifecycle:
 *   connect():
 *     1. getOrCreateUnlockedAudioContext()        (sync, in user gesture)
 *     2. playInstantGreeting(lang)                (sync, bridges cold start)
 *     3. pinIOSLoudspeakerRoute()                 (sync, pre-getUserMedia)
 *     4. mintToken() → POST /api/v1/orb/livekit/token
 *     5. new Room().connect(url, token)
 *     6. localParticipant.setMicrophoneEnabled(true)
 *     7. on track-subscribed: speaking/listening state updates
 *     8. on data-channel: tool-call events for the surrounding ORB shell
 *
 *   disconnect():
 *     1. room.disconnect()
 *     2. releaseIOSLoudspeakerRoute()
 *
 * Activated only when useActiveVoiceProvider() returns 'livekit'. The
 * surrounding useOrbVoiceWidget shell picks this hook over the SSE-based
 * sibling at session start.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteAudioTrack,
  Track,
  ConnectionState,
  DataPacket_Kind,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateUnlockedAudioContext } from "@/lib/iosAudioUnlock";
import { pinIOSLoudspeakerRoute, releaseIOSLoudspeakerRoute } from "@/lib/iosAudioRoutePin";
import { playInstantGreeting } from "@/lib/instantGreeting";

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
  onToolCall?: (toolName: string, args: unknown) => void;
  onAgentChanged?: (agentId: string) => void;
}

interface MintedToken {
  url: string;
  token: string;
  room: string;
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

export function useLiveKitVoice(callbacks: LiveKitVoiceCallbacks = {}) {
  const [state, setState] = useState<LiveKitVoiceState>(initialState);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const roomRef = useRef<Room | null>(null);

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
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 503) return null;
      if (!res.ok) {
        const detail = await res.text();
        callbacksRef.current.onError?.(`token mint failed (${res.status}): ${detail}`);
        return null;
      }
      const body = await res.json();
      if (!body.url || !body.token) return null;
      return body as MintedToken;
    } catch (e) {
      callbacksRef.current.onError?.(`token mint network error: ${(e as Error).message}`);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (roomRef.current) return; // idempotent

    // 1. iOS gesture-bound unlock — MUST run synchronously in the user
    //    gesture before any await. Same pattern as useOrbVoiceClient.
    getOrCreateUnlockedAudioContext();

    // 2. Instant greeting — bridge the cold-start gap before LiveKit
    //    connect lands. Sync inside gesture.
    const lang = (navigator.language || "en").split("-")[0];
    try {
      playInstantGreeting(lang);
    } catch {
      // non-fatal
    }

    // 3. iOS loudspeaker pin — must precede getUserMedia.
    pinIOSLoudspeakerRoute();

    setState((s) => ({ ...s, lastError: null, isReconnecting: true }));

    const minted = await mintToken();
    if (!minted) {
      setState((s) => ({ ...s, isReconnecting: false }));
      return;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    roomRef.current = room;

    // ----- wire events -----
    room.on(RoomEvent.ConnectionStateChanged, (st) => {
      const connected = st === ConnectionState.Connected;
      setState((s) => ({
        ...s,
        isConnected: connected,
        isReconnecting: st === ConnectionState.Reconnecting,
      }));
      callbacksRef.current.onConnectionStateChange?.(connected);
    });

    room.on(RoomEvent.TrackSubscribed, (track, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        const audioTrack = track as RemoteAudioTrack;
        // LiveKit attaches its own audio element via track.attach() — we
        // don't need to schedule PCM through Web Audio ourselves.
        const el = audioTrack.attach();
        el.style.display = "none";
        document.body.appendChild(el);
        // Speaking/listening state mirrors the agent's audio activity.
        track.on("started", () => {
          setState((s) => ({ ...s, isSpeaking: true, isListening: false }));
          callbacksRef.current.onSpeakingChange?.(true);
          callbacksRef.current.onListeningChange?.(false);
        });
        track.on("ended", () => {
          setState((s) => ({ ...s, isSpeaking: false, isListening: true }));
          callbacksRef.current.onSpeakingChange?.(false);
          callbacksRef.current.onListeningChange?.(true);
        });
      }
    });

    room.on(RoomEvent.DataReceived, (payload, _participant, _kind: DataPacket_Kind) => {
      try {
        const decoded = new TextDecoder().decode(payload);
        const msg = JSON.parse(decoded) as { type?: string; [k: string]: unknown };
        switch (msg.type) {
          case "transcript":
            callbacksRef.current.onTranscript?.(
              String(msg.text ?? ""),
              Boolean(msg.is_user),
            );
            break;
          case "link":
            callbacksRef.current.onLink?.(String(msg.url ?? ""), msg.title as string | undefined);
            break;
          case "tool_call":
            callbacksRef.current.onToolCall?.(
              String(msg.name ?? ""),
              msg.args ?? {},
            );
            break;
          case "agent_changed":
            setState((s) => ({ ...s, activeAgentId: String(msg.agent_id ?? null) }));
            callbacksRef.current.onAgentChanged?.(String(msg.agent_id ?? ""));
            break;
        }
      } catch {
        // ignore non-JSON data packets
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      setState((s) => ({ ...s, isConnected: false, isReconnecting: false }));
      releaseIOSLoudspeakerRoute();
      callbacksRef.current.onConnectionStateChange?.(false);
    });

    try {
      await room.connect(minted.url, minted.token);
      // Publish mic. iOS requires this to be on a fresh user-gesture stack;
      // because connect() is invoked from the ORB widget click handler we
      // are still inside that gesture chain.
      await room.localParticipant.setMicrophoneEnabled(true);
      setState((s) => ({
        ...s,
        isConnected: true,
        isReconnecting: false,
        isListening: true,
        activeAgentId: "vitana",
      }));
      callbacksRef.current.onListeningChange?.(true);
    } catch (e) {
      const msg = (e as Error).message;
      setState((s) => ({ ...s, isConnected: false, isReconnecting: false, lastError: msg }));
      callbacksRef.current.onError?.(`connect failed: ${msg}`);
      try {
        await room.disconnect();
      } catch {}
      roomRef.current = null;
      releaseIOSLoudspeakerRoute();
    }
  }, [mintToken]);

  const disconnect = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    void room.disconnect();
    roomRef.current = null;
    setState(initialState);
    releaseIOSLoudspeakerRoute();
    callbacksRef.current.onConnectionStateChange?.(false);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const room = roomRef.current;
    if (!room) {
      callbacksRef.current.onError?.("not connected");
      return;
    }
    const payload = new TextEncoder().encode(JSON.stringify({ type: "user_text", text }));
    try {
      await room.localParticipant.publishData(payload, { reliable: true });
    } catch (e) {
      callbacksRef.current.onError?.(`publishData failed: ${(e as Error).message}`);
    }
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const room = roomRef.current;
      if (room) {
        void room.disconnect();
        roomRef.current = null;
      }
      releaseIOSLoudspeakerRoute();
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
