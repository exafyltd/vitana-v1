import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import SubNavigation from '@/components/SubNavigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Users, 
  MessageCircle, 
  Send,
  Heart,
  ThumbsUp,
  Settings,
  Share2,
  Phone
} from 'lucide-react';
import { communityNavigation } from '@/config/navigation';
import { LiveRoom } from '@/components/LiveRoom';
import { useStreamLifecycle } from '@/hooks/useStreamLifecycle';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useStreamRecording } from '@/hooks/useStreamRecording';
import { StreamRecordingPlayer } from '@/components/StreamRecordingPlayer';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { ChatMessage, Participant } from '@/types/chat';
import type { LiveStream } from '@/hooks/useLiveStreams';

export default function LiveRoomViewer() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get state passed from navigation
  const { userId, userName, userAvatar, room, isHost } = location.state || {};

  // Use auth context as fallback if navigation state is missing
  const effectiveUserId = userId || user?.id;
  const effectiveUserName = userName || user?.email?.split('@')[0] || 'Guest';
  const effectiveUserAvatar = userAvatar;
  const effectiveIsHost = isHost || false;

  const [messageInput, setMessageInput] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch stream data
  const { data: streamData, isLoading } = useQuery({
    queryKey: ['live-stream', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_live_streams')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (error) throw error;
      return data as LiveStream;
    },
    enabled: !!roomId,
  });

  // Fetch recording if stream has ended
  const { data: recordingData } = useQuery({
    queryKey: ['stream-recording', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stream_recordings')
        .select('*')
        .eq('stream_id', roomId)
        .eq('status', 'ready')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    },
    enabled: streamData?.status === 'ended'
  });

  // Initialize chat
  const { messages, sendMessage, sendReaction } = useLiveChat({
    roomId: roomId || '',
    userId: effectiveUserId || '',
    userName: effectiveUserName,
    userAvatar: effectiveUserAvatar,
  });

  // Initialize WebRTC
  const { localStream, peers, isConnected, joinRoom: joinWebRTCRoom, leaveRoom: leaveWebRTCRoom } = useWebRTC({
    roomId: roomId || '',
    userId: effectiveUserId || '',
    isAudioEnabled: true,
    isVideoEnabled: streamData?.stream_type === 'video',
  });

  // Track participants (from WebRTC peers + self)
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Stream lifecycle management
  const { endStream } = useStreamLifecycle({
    roomId: roomId || '',
    isHost: effectiveIsHost,
    viewerCount: peers.length + 1,
    messageCount: messages.length,
    streamStatus: streamData?.status,
  });

  // Recording hook
  const { isRecording, stopRecording } = useStreamRecording({
    streamId: roomId || '',
    localStream,
    isHost: effectiveIsHost,
    enabled: streamData?.enable_recording ?? false,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect if no proper state (with fallback to authenticated user)
  useEffect(() => {
    if (!effectiveUserId) {
      toast({
        title: "Invalid access",
        description: "Please sign in to join live rooms",
        variant: "destructive",
      });
      navigate('/comm/live-rooms');
    }
  }, [effectiveUserId, navigate, toast]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    await sendMessage(messageInput);
    setMessageInput('');
  };

  const handleReaction = async (emoji: string) => {
    await sendReaction(emoji);
    toast({
      title: `${emoji} Sent!`,
      description: "Your reaction was shared with everyone",
    });
  };

  const handleLeaveRoom = async () => {
    if (effectiveIsHost) {
      if (isRecording) {
        await stopRecording();
      }
      await endStream();
      toast({
        title: "Stream Ended",
        description: "Your live stream has ended",
      });
    }
    leaveWebRTCRoom();
    setIsInRoom(false);
    navigate('/comm/live-rooms');
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading stream...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!streamData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl mb-4">Stream not found</p>
            <Button onClick={() => navigate('/comm/live-rooms')}>
              Back to Live Rooms
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <SEO 
        title={`${streamData.title} - Live Room`}
        description={streamData.description || `Join ${userName}'s live stream`}
      />
      <AppLayout>
        <SubNavigation items={communityNavigation} />
        
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/comm/live-rooms')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{streamData.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="destructive" className="animate-pulse">
                    LIVE
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {participants.length} watching
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Video Area */}
            <div className="flex-1 flex flex-col bg-muted/50">
              {streamData?.status === 'ended' && recordingData ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <Card className="w-full max-w-4xl p-6">
                    <h2 className="text-2xl font-bold mb-4">Stream Replay</h2>
                    <StreamRecordingPlayer recording={recordingData} />
                  </Card>
                </div>
              ) : isInRoom ? (
                <>
                  <LiveRoom
                    roomId={roomId || ''}
                    userId={effectiveUserId || ''}
                    userName={effectiveUserName}
                    onLeave={handleLeaveRoom}
                  />
                  {isRecording && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full animate-pulse z-10">
                      <div className="w-3 h-3 bg-white rounded-full" />
                      Recording
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Card className="p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold mb-4">Ready to join?</h2>
                    <p className="text-muted-foreground mb-6">
                      {effectiveIsHost
                        ? "Click below to start broadcasting to your audience"
                        : "Click below to join the live stream"
                      }
                    </p>
                    <Button
                      size="lg"
                      onClick={() => setIsInRoom(true)}
                      className="w-full"
                    >
                      <Phone className="h-5 w-5 mr-2" />
                      {effectiveIsHost ? 'Start Broadcasting' : 'Join Stream'}
                    </Button>
                  </Card>
                </div>
              )}

              {/* Reaction Buttons - Show when in room */}
              {isInRoom && streamData?.status !== 'ended' && (
                <div className="p-4 border-t bg-background/95 backdrop-blur flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleReaction('❤️')}
                    className="rounded-full"
                  >
                    <Heart className="h-5 w-5 mr-2 text-red-500 fill-red-500" />
                    Heart
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleReaction('👍')}
                    className="rounded-full"
                  >
                    <ThumbsUp className="h-5 w-5 mr-2 text-blue-500" />
                    Like
                  </Button>
                </div>
              )}
            </div>

            {/* Right Sidebar - Chat & Participants */}
            <div className="w-96 border-l flex flex-col bg-background">
              {/* Tabs */}
              <div className="flex border-b">
                <button
                  className={`flex-1 px-4 py-3 font-medium transition-colors ${
                    !showParticipants 
                      ? 'border-b-2 border-primary bg-primary/5' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => setShowParticipants(false)}
                >
                  <MessageCircle className="h-4 w-4 inline mr-2" />
                  Chat
                </button>
                <button
                  className={`flex-1 px-4 py-3 font-medium transition-colors ${
                    showParticipants 
                      ? 'border-b-2 border-primary bg-primary/5' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => setShowParticipants(true)}
                >
                  <Users className="h-4 w-4 inline mr-2" />
                  Participants ({participants.length})
                </button>
              </div>

              {/* Content Area */}
              <ScrollArea className="flex-1 p-4">
                {!showParticipants ? (
                  // Chat Messages
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Be the first to say hello!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.userAvatar} />
                            <AvatarFallback>
                              {msg.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-sm">
                                {msg.userName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>
                            {msg.type === 'reaction' ? (
                              <p className="text-2xl">{msg.emoji}</p>
                            ) : (
                              <p className="text-sm mt-1">{msg.message}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  // Participants List
                  <div className="space-y-2">
                    {participants.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No participants yet</p>
                      </div>
                    ) : (
                      participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                        >
                          <Avatar>
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback>
                              {participant.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {participant.name}
                            </p>
                            {participant.isHost && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Host
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Chat Input - Only show when on chat tab */}
              {!showParticipants && (
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Send a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}
