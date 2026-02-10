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
  // Use refs to avoid re-creating initializeLocalStream when toggling
  const isAudioEnabledRef = useRef(config.isAudioEnabled ?? true);
  const isVideoEnabledRef = useRef(config.isVideoEnabled ?? true);

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
      const wantVideo = isVideoEnabledRef.current;
      const wantAudio = isAudioEnabledRef.current;
      console.log('🎤 Requesting media devices - video:', wantVideo, 'audio:', wantAudio);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: wantVideo,
        audio: wantAudio
      });
      
      console.log('✅ Media devices acquired');
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Camera/microphone permission denied');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No camera/microphone found');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Camera/microphone already in use');
        }
      }
      throw error;
    }
  }, []); // No state dependencies - uses refs

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
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        console.log(`📡 Attempting to join room (attempt ${retries + 1}/${maxRetries})`);
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
          console.log('👋 Peer joined:', newPresences);
          newPresences.forEach((presence: any) => {
            if (presence.user_id !== config.userId) {
              console.log('🤝 Connecting to peer:', presence.user_id);
              connectToPeer(presence.user_id);
            }
          });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('👋 Peer left:', leftPresences);
          leftPresences.forEach((presence: any) => {
            setPeers(prev => {
              const updated = new Map(prev);
              const peer = updated.get(presence.user_id);
              if (peer) {
                console.log('🔌 Closing connection to:', presence.user_id);
                peer.connection.close();
                updated.delete(presence.user_id);
              }
              return updated;
            });
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ WebRTC channel subscribed, tracking presence');
            await channel.track({ user_id: config.userId, online_at: new Date().toISOString() });
            setIsConnected(true);
          }
        });

        channelRef.current = channel;
        return; // Success, exit retry loop
        
      } catch (error) {
        retries++;
        console.error(`❌ Error joining room (attempt ${retries}/${maxRetries}):`, error);
        
        if (retries >= maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }, [config.roomId, config.userId, initializeLocalStream, handleOffer, handleAnswer, handleIceCandidate, connectToPeer]);

  const leaveRoom = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    peers.forEach(peer => {
      peer.connection.close();
    });
    setPeers(new Map());

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
        isAudioEnabledRef.current = audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        isVideoEnabledRef.current = videoTrack.enabled;
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
