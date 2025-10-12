import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface WebRTCConfig {
  roomId: string;
  userId: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

interface Peer {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export const useWebRTC = (config: WebRTCConfig) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(config.isAudioEnabled ?? true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(config.isVideoEnabled ?? true);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming streams
    pc.ontrack = (event) => {
      setPeers(prev => {
        const updated = new Map(prev);
        const peer = updated.get(peerId);
        if (peer) {
          peer.stream = event.streams[0];
          updated.set(peerId, peer);
        }
        return updated;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: config.userId,
            to: peerId
          }
        });
      }
    };

    return pc;
  }, [config.userId]);

  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, [isVideoEnabled, isAudioEnabled]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromPeer: string) => {
    const pc = createPeerConnection(fromPeer);
    
    setPeers(prev => {
      const updated = new Map(prev);
      updated.set(fromPeer, { id: fromPeer, connection: pc });
      return updated;
    });

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          answer,
          from: config.userId,
          to: fromPeer
        }
      });
    }
  }, [createPeerConnection, config.userId]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, fromPeer: string) => {
    const peer = peers.get(fromPeer);
    if (peer) {
      await peer.connection.setRemoteDescription(answer);
    }
  }, [peers]);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, fromPeer: string) => {
    const peer = peers.get(fromPeer);
    if (peer) {
      await peer.connection.addIceCandidate(candidate);
    }
  }, [peers]);

  const connectToPeer = useCallback(async (peerId: string) => {
    const pc = createPeerConnection(peerId);
    
    setPeers(prev => {
      const updated = new Map(prev);
      updated.set(peerId, { id: peerId, connection: pc });
      return updated;
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          offer,
          from: config.userId,
          to: peerId
        }
      });
    }
  }, [createPeerConnection, config.userId]);

  const joinRoom = useCallback(async () => {
    try {
      await initializeLocalStream();

      const channel = supabase.channel(`room:${config.roomId}`, {
        config: {
          broadcast: { self: true }
        }
      });

      channel
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload.to === config.userId) {
            await handleOffer(payload.offer, payload.from);
          }
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.to === config.userId) {
            await handleAnswer(payload.answer, payload.from);
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.to === config.userId) {
            await handleIceCandidate(payload.candidate, payload.from);
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          // Connect to newly joined peer
          newPresences.forEach((presence: any) => {
            if (presence.user_id !== config.userId) {
              connectToPeer(presence.user_id);
            }
          });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          // Clean up disconnected peer
          leftPresences.forEach((presence: any) => {
            setPeers(prev => {
              const updated = new Map(prev);
              const peer = updated.get(presence.user_id);
              if (peer) {
                peer.connection.close();
                updated.delete(presence.user_id);
              }
              return updated;
            });
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: config.userId, online_at: new Date().toISOString() });
            setIsConnected(true);
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }, [config.roomId, config.userId, initializeLocalStream, handleOffer, handleAnswer, handleIceCandidate, connectToPeer]);

  const leaveRoom = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Close all peer connections
    peers.forEach(peer => {
      peer.connection.close();
    });
    setPeers(new Map());

    // Unsubscribe from channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setIsConnected(false);
  }, [peers]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

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
};
