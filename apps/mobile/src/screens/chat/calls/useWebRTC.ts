/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — WebRTC
 * signalling for the 1:1 call. Native twin of web `src/hooks/useWebRTC.ts`
 * (class B): the same room channel `room:<callId>` (broadcast to self),
 * `offer` / `answer` / `ice-candidate` broadcasts addressed by `to`, presence
 * join → offer to the newcomer, presence leave → close that peer, the same
 * STUN servers and three join attempts 2 s apart. Media and peer connections
 * come from `src/ports/webrtc` (no engine is registered in this build → the
 * join fails and the call screen ends the call, as the web does when media
 * cannot start).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '../../../auth/client';
import { getWebRTCEngine, type MediaStreamLike, type PeerConnectionLike } from '../../../ports/webrtc';

export const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

export interface Peer {
  id: string;
  connection: PeerConnectionLike;
  stream?: MediaStreamLike;
}

export interface WebRTCConfig {
  roomId: string;
  userId: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

type Channel = ReturnType<ReturnType<typeof getSupabase>['channel']>;
type SignalPayload = { payload: { to?: string; from: string; offer?: unknown; answer?: unknown; candidate?: unknown } };
type PresencePayload = { newPresences?: Array<{ user_id?: string }>; leftPresences?: Array<{ user_id?: string }> };

export function useWebRTC(config: WebRTCConfig) {
  const [localStream, setLocalStream] = useState<MediaStreamLike | null>(null);
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(config.isAudioEnabled ?? true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(config.isVideoEnabled ?? true);
  const channelRef = useRef<Channel | null>(null);
  const localStreamRef = useRef<MediaStreamLike | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const audioRef = useRef(config.isAudioEnabled ?? true);
  const videoRef = useRef(config.isVideoEnabled ?? true);

  const updatePeers = useCallback((fn: (prev: Map<string, Peer>) => Map<string, Peer>) => {
    setPeers((prev) => {
      const next = fn(prev);
      peersRef.current = next;
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string): PeerConnectionLike => {
      const engine = getWebRTCEngine();
      if (!engine) throw new Error('WebRTC unavailable');
      const pc = engine.createPeerConnection(ICE_SERVERS);
      const local = localStreamRef.current;
      if (local) local.getTracks().forEach((track) => pc.addTrack(track, local));
      pc.ontrack = (event) => {
        updatePeers((prev) => {
          const next = new Map(prev);
          const peer = next.get(peerId);
          if (peer) next.set(peerId, { ...peer, stream: event.streams[0] });
          return next;
        });
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          void channelRef.current.send({ type: 'broadcast', event: 'ice-candidate', payload: { candidate: event.candidate, from: config.userId, to: peerId } });
        }
      };
      return pc;
    },
    [config.userId, updatePeers],
  );

  const initializeLocalStream = useCallback(async () => {
    const engine = getWebRTCEngine();
    if (!engine) throw new Error('WebRTC unavailable');
    const stream = await engine.getUserMedia({ video: videoRef.current, audio: audioRef.current });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const connectToPeer = useCallback(
    async (peerId: string) => {
      const pc = createPeerConnection(peerId);
      updatePeers((prev) => new Map(prev).set(peerId, { id: peerId, connection: pc }));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      void channelRef.current?.send({ type: 'broadcast', event: 'offer', payload: { offer, from: config.userId, to: peerId } });
    },
    [createPeerConnection, updatePeers, config.userId],
  );

  const handleOffer = useCallback(
    async (offer: unknown, fromPeer: string) => {
      const pc = createPeerConnection(fromPeer);
      updatePeers((prev) => new Map(prev).set(fromPeer, { id: fromPeer, connection: pc }));
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      void channelRef.current?.send({ type: 'broadcast', event: 'answer', payload: { answer, from: config.userId, to: fromPeer } });
    },
    [createPeerConnection, updatePeers, config.userId],
  );

  const joinRoom = useCallback(async () => {
    let retries = 0;
    for (;;) {
      try {
        await initializeLocalStream();
        const channel: Channel = getSupabase().channel(`room:${config.roomId}`, { config: { broadcast: { self: true } } });
        channel
          .on('broadcast', { event: 'offer' }, ({ payload }: SignalPayload) => {
            if (payload.to === config.userId) void handleOffer(payload.offer, payload.from);
          })
          .on('broadcast', { event: 'answer' }, ({ payload }: SignalPayload) => {
            if (payload.to === config.userId) void peersRef.current.get(payload.from)?.connection.setRemoteDescription(payload.answer);
          })
          .on('broadcast', { event: 'ice-candidate' }, ({ payload }: SignalPayload) => {
            if (payload.to === config.userId) void peersRef.current.get(payload.from)?.connection.addIceCandidate(payload.candidate);
          })
          .on('presence', { event: 'join' }, ({ newPresences }: PresencePayload) => {
            (newPresences ?? []).forEach((p) => {
              if (p.user_id && p.user_id !== config.userId) void connectToPeer(p.user_id);
            });
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }: PresencePayload) => {
            (leftPresences ?? []).forEach((p) => {
              updatePeers((prev) => {
                const next = new Map(prev);
                const peer = p.user_id ? next.get(p.user_id) : undefined;
                if (peer && p.user_id) {
                  peer.connection.close();
                  next.delete(p.user_id);
                }
                return next;
              });
            });
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              void channel.track({ user_id: config.userId, online_at: new Date().toISOString() });
              setIsConnected(true);
            }
          });
        channelRef.current = channel;
        return;
      } catch (error) {
        retries += 1;
        if (retries >= 3) throw error;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }, [config.roomId, config.userId, initializeLocalStream, handleOffer, connectToPeer, updatePeers]);

  const leaveRoom = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    peersRef.current.forEach((peer) => peer.connection.close());
    peersRef.current = new Map();
    setPeers(new Map());
    if (channelRef.current) {
      void channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      audioRef.current = track.enabled;
      setIsAudioEnabled(track.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      videoRef.current = track.enabled;
      setIsVideoEnabled(track.enabled);
    }
  }, []);

  useEffect(() => () => leaveRoom(), [leaveRoom]);

  return {
    localStream,
    peers: Array.from(peers.values()),
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
  };
}
