import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessengerCallProps {
  callId: string;
  userId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  isVideoCall: boolean;
  onEndCall: () => void;
}

export const MessengerCall = ({
  callId,
  userId,
  recipientId,
  recipientName,
  recipientAvatar,
  isVideoCall,
  onEndCall,
}: MessengerCallProps) => {
  const [callDuration, setCallDuration] = useState(0);
  
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
  } = useWebRTC({
    roomId: callId,
    userId,
    isVideoEnabled: isVideoCall,
    isAudioEnabled: true,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    joinRoom();
    return () => {
      leaveRoom();
    };
  }, [joinRoom, leaveRoom]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && peers[0]?.stream) {
      remoteVideoRef.current.srcObject = peers[0].stream;
    }
  }, [peers]);

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    leaveRoom();
    onEndCall();
  };

  const remotePeer = peers[0];
  const showVideo = isVideoCall && remotePeer?.stream;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Remote Video/Avatar */}
      <div className="flex-1 relative bg-muted flex items-center justify-center">
        {showVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={recipientAvatar} />
              <AvatarFallback>
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-semibold">{recipientName}</h2>
            <p className="text-muted-foreground">
              {isConnected ? formatDuration(callDuration) : 'Connecting...'}
            </p>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {isVideoCall && localStream && (
          <Card className="absolute top-4 right-4 w-32 h-24 overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 bg-card border-t">
        <div className="flex items-center justify-center gap-6">
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full h-16 w-16"
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          {isVideoCall && (
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full h-16 w-16"
            >
              {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
          )}

          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="rounded-full h-16 w-16"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        {isConnected && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {formatDuration(callDuration)}
          </p>
        )}
      </div>
    </div>
  );
};
