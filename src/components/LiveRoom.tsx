import { useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Maximize, Minimize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { notifyError } from '@/lib/i18n-toast';

interface LiveRoomProps {
  roomId: string;
  userId: string;
  userName: string;
  onLeave: () => void;
}

export const LiveRoom = ({ roomId, userId, userName, onLeave }: LiveRoomProps) => {
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    localStream,
    peers,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
  } = useWebRTC({ roomId, userId, isVideoEnabled: true, isAudioEnabled: true });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    joinRoom().catch(error => {
      notifyError('toasts.common.failedJoinRoom');
    });

    return () => {
      leaveRoom();
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen not supported:', err);
    }
  }, []);

  // Listen for fullscreen exit via Escape
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 overflow-auto">
        {/* Local Video */}
        <Card className="relative aspect-video bg-muted overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm text-white">
            {userName} (You)
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </Card>

        {/* Remote Peers */}
        {peers.map((peer) => (
          <RemoteVideo key={peer.id} peer={peer} />
        ))}

        {/* Empty slots */}
        {peers.length === 0 && (
          <Card className="aspect-video bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">Waiting for others to join...</p>
          </Card>
        )}
      </div>

      {/* Controls */}
      <div className="border-t p-4 bg-card">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full h-14 w-14"
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full h-14 w-14"
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="rounded-full h-14 w-14"
          >
            <Monitor className="h-6 w-6" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={toggleFullscreen}
            className="rounded-full h-14 w-14"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={handleLeave}
            className="rounded-full h-14 w-14"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        {isConnected && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {peers.length + 1} participant{peers.length !== 0 ? 's' : ''} in the room
          </p>
        )}
      </div>
    </div>
  );
};

interface RemoteVideoProps {
  peer: { id: string; stream?: MediaStream };
}

const RemoteVideo = ({ peer }: RemoteVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <Card className="relative aspect-video bg-muted overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm text-white">
        Participant
      </div>
    </Card>
  );
};
