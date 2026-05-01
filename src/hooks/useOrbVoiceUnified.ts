/**
 * VTID-LIVEKIT-FOUNDATION: useOrbVoiceUnified — provider-agnostic ORB hook.
 *
 * Wraps both useOrbVoiceClient (Vertex / SSE) and useLiveKitVoice
 * (LiveKit / WebRTC) and returns whichever one matches the global active
 * provider flag from useActiveVoiceProvider().
 *
 * Why this hook exists: VitanaAudioOverlay (and any other consumer) wants
 * a single hook that "does ORB voice". The mutually-exclusive runtime
 * means at any moment exactly one of the two is in use. React's rules-of-
 * hooks forbid conditional hook calls, so we call BOTH unconditionally
 * but only invoke connect()/disconnect()/etc. on the active one — the
 * other sits idle in its initial state (no network, no audio).
 *
 * The return shape matches useOrbVoiceClient so the swap-in is
 * mechanical: change the import + call site in VitanaAudioOverlay and
 * the rest of the file stays the same.
 */
import { useCallback, useMemo } from "react";
import { useActiveVoiceProvider } from "./useActiveVoiceProvider";
import { useLiveKitVoice } from "./useLiveKitVoice";
import { useOrbVoiceClient } from "./useOrbVoiceClient";

type ConnectionState = "disconnected" | "connecting" | "ready";

export interface UseOrbVoiceUnifiedReturn {
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
  /** Which pipeline served this session ('vertex' | 'livekit'). */
  activeProvider: "vertex" | "livekit";
}

export function useOrbVoiceUnified(): UseOrbVoiceUnifiedReturn {
  const { provider } = useActiveVoiceProvider();
  const vertex = useOrbVoiceClient();
  const livekit = useLiveKitVoice();

  const isLk = provider === "livekit";

  const connect = useCallback(async () => {
    if (isLk) {
      await livekit.connect();
    } else {
      await vertex.connect();
    }
  }, [isLk, livekit, vertex]);

  const disconnect = useCallback(() => {
    if (isLk) livekit.disconnect();
    else vertex.disconnect();
  }, [isLk, livekit, vertex]);

  const startListening = useCallback(async () => {
    if (isLk) {
      // LiveKit: mic publish happens inside connect() — separate
      // start/stop is a no-op. Mapping to the contract.
      return;
    }
    await vertex.startListening();
  }, [isLk, vertex]);

  const stopListening = useCallback(() => {
    if (!isLk) vertex.stopListening();
  }, [isLk, vertex]);

  const sendMessage = useCallback(
    (text: string) => {
      if (isLk) void livekit.sendMessage(text);
      else vertex.sendMessage(text);
    },
    [isLk, livekit, vertex],
  );

  const endTurn = useCallback(() => {
    if (!isLk) vertex.endTurn();
    // LiveKit handles turn-end via VAD / LiveKit-agents; nothing to do here.
  }, [isLk, vertex]);

  const adapted = useMemo<UseOrbVoiceUnifiedReturn>(() => {
    if (isLk) {
      const lkConnectionState: ConnectionState = livekit.isConnected
        ? "ready"
        : livekit.isReconnecting
          ? "connecting"
          : "disconnected";
      return {
        connectionState: lkConnectionState,
        isListening: livekit.isListening,
        isProcessing: false, // LiveKit doesn't expose processing — derive if needed
        isSpeaking: livekit.isSpeaking,
        isReconnecting: livekit.isReconnecting,
        error: livekit.lastError,
        volumeLevel: 0,
        transcript: "",
        connect,
        disconnect,
        startListening,
        stopListening,
        sendMessage,
        endTurn,
        activeProvider: "livekit",
      };
    }
    return {
      connectionState: vertex.connectionState,
      isListening: vertex.isListening,
      isProcessing: vertex.isProcessing,
      isSpeaking: vertex.isSpeaking,
      isReconnecting: vertex.isReconnecting,
      error: vertex.error,
      volumeLevel: vertex.volumeLevel,
      transcript: vertex.transcript,
      connect,
      disconnect,
      startListening,
      stopListening,
      sendMessage,
      endTurn,
      activeProvider: "vertex",
    };
  }, [isLk, livekit, vertex, connect, disconnect, startListening, stopListening, sendMessage, endTurn]);

  return adapted;
}
