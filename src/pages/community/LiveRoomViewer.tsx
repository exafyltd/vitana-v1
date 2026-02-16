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
import { DailyVideoRoom } from '@/components/liverooms/DailyVideoRoom';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useStreamRecording } from '@/hooks/useStreamRecording';
import { StreamRecordingPlayer } from '@/components/StreamRecordingPlayer';
import { liveRoomService } from '@/services/liveRoomService';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useRoomState, useEndRoom } from '@/hooks/useMyRoom';
import { useHostPresence } from '@/hooks/useHostPresence';
import type { ChatMessage, Participant } from '@/types/chat';

export default function LiveRoomViewer() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get state passed from navigation
  const { userId, userName, userAvatar, room, isHost, daily_room_url: navDailyRoomUrl } = location.state || {};

  // Use auth context as fallback if navigation state is missing
  const effectiveUserId = userId || user?.id;
  const effectiveUserName = userName || user?.email?.split('@')[0] || 'Guest';
  const effectiveUserAvatar = userAvatar;

  // DB-based isHost detection (survives page refresh)
  const { data: dbRoom } = useQuery({
    queryKey: ['live-room-host', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('live_rooms')
        .select('host_user_id, metadata')
        .eq('id', roomId!)
        .maybeSingle();
      return data;
    },
    enabled: !!roomId && !!user?.id,
    staleTime: 60_000,
  });
  const effectiveIsHost = isHost || (!!user?.id && dbRoom?.host_user_id === user.id);

  const [messageInput, setMessageInput] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Room state polling (every 5s while live)
  const { data: roomState } = useRoomState(roomId, true);
  const roomStatus = roomState?.room?.status || room?.status;
  const sessionData = roomState?.session;
  const viewerCounts = roomState?.counts;

  // Host presence signals
  useHostPresence(roomId, effectiveIsHost);

  // End room mutation (gateway)
  const { mutate: endRoomMutation, isPending: isEnding } = useEndRoom();

  // Fallback: end room directly via Supabase if gateway fails
  const endRoomFallback = async (id: string) => {
    try {
      // Clear current_session_id and set idle
      await supabase
        .from('live_rooms')
        .update({ status: 'idle', current_session_id: null, ends_at: new Date().toISOString() })
        .eq('id', id);
      // End any active sessions for this room
      await supabase
        .from('live_room_sessions')
        .update({ status: 'ended', ends_at: new Date().toISOString() })
        .eq('room_id', id)
        .in('status', ['lobby', 'live', 'scheduled']);
      // Sync to community_live_streams for listing visibility
      await supabase
        .from('community_live_streams')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', id);
      toast({ title: 'Room ended', description: 'Your session has ended' });
      navigate('/comm/live-rooms');
    } catch (err) {
      console.error('[EndRoom] Fallback also failed:', err);
      toast({ title: 'Failed to end room', variant: 'destructive' });
    }
  };

  // Fetch recording if stream has ended
  const { data: recordingData } = useQuery({
    queryKey: ['stream-recording', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stream_recordings')
        .select('*')
        .eq('stream_id', roomId)
        .eq('status', 'ready')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: roomStatus === 'ended' || roomStatus === 'idle'
  });

  // Initialize chat
  const { messages, sendMessage, sendReaction } = useLiveChat({
    roomId: roomId || '',
    userId: effectiveUserId || '',
    userName: effectiveUserName,
    userAvatar: effectiveUserAvatar,
  });

  // Daily.co room URL: navigation state first (from GoLivePopup), DB metadata as fallback
  const dailyRoomUrlFromDb = (dbRoom?.metadata as Record<string, unknown>)?.daily_room_url as string | null ?? null;
  const dailyRoomUrl = navDailyRoomUrl || dailyRoomUrlFromDb;

  // Track participants
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Recording hook
  const { isRecording, stopRecording } = useStreamRecording({
    streamId: roomId || '',
    localStream: null,
    isHost: effectiveIsHost,
    enabled: sessionData?.enable_recording ?? false,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect if no proper state
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
    if (effectiveIsHost && roomId) {
      if (isRecording) {
        await stopRecording();
      }
      // Try gateway first, fallback to direct Supabase
      endRoomMutation(roomId, {
        onError: () => {
          console.warn('[LiveRoomViewer] Gateway end failed, using Supabase fallback');
          endRoomFallback(roomId);
        },
      });
      toast({
        title: "Stream Ended",
        description: "Your live stream has ended",
      });
    }
    setIsInRoom(false);
    navigate('/comm/live-rooms');
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const streamTitle = sessionData?.session_title || room?.title || 'Live Room';
  const streamDescription = sessionData?.session_description || room?.description;
  const isLive = roomStatus === 'live' || roomStatus === 'lobby';
  const hasEnded = roomStatus === 'ended' || roomStatus === 'idle';

  if (!roomId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl mb-4">Room not found</p>
            <Button onClick={() => navigate('/comm/live-rooms')}>
              Back to Live Rooms
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show ended state
  if (hasEnded && !isInRoom) {
    return (
      <>
        <SEO title="Room Ended" />
        <AppLayout>
          <SubNavigation items={communityNavigation} />
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <Card className="p-8 text-center max-w-md">
              <h2 className="text-2xl font-bold mb-4">This room has ended</h2>
              <p className="text-muted-foreground mb-6">
                The session "{streamTitle}" has concluded.
              </p>
              {recordingData && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Stream Replay</h3>
                  <StreamRecordingPlayer recording={recordingData} />
                </div>
              )}
              <Button onClick={() => navigate('/comm/live-rooms')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Rooms
              </Button>
            </Card>
          </div>
        </AppLayout>
      </>
    );
  }

  return (
    <>
      <SEO 
        title={`${streamTitle} - Live Room`}
        description={streamDescription || `Join ${effectiveUserName}'s live stream`}
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
                <h1 className="text-xl font-semibold">{streamTitle}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {isLive && (
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {viewerCounts?.in_room || participants.length} watching
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
              {isInRoom ? (
                <>
                  {dailyRoomUrl ? (
                    <DailyVideoRoom
                      roomUrl={dailyRoomUrl}
                      onJoined={() => {
                        console.log('[Daily] Joined meeting');
                        if (effectiveIsHost && roomId) {
                          liveRoomService.hostPresent(roomId).catch(console.warn);
                        }
                      }}
                      onLeft={() => {
                        if (effectiveIsHost && roomId) {
                          liveRoomService.hostAbsent(roomId).catch(console.warn);
                        }
                        handleLeaveRoom();
                      }}
                      onError={(err) => {
                        console.error('[Daily] Error:', err);
                        toast({ title: 'Video error', description: err, variant: 'destructive' });
                      }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                        <p>Setting up video room...</p>
                      </div>
                    </div>
                  )}
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

              {/* Reaction Buttons */}
              {isInRoom && isLive && (
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
                  {effectiveIsHost && (
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={handleLeaveRoom}
                      disabled={isEnding}
                      className="rounded-full"
                    >
                      {isEnding ? 'Ending...' : 'End Room'}
                    </Button>
                  )}
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
                  Participants ({viewerCounts?.in_room || participants.length})
                </button>
              </div>

              {/* Content Area */}
              <ScrollArea className="flex-1 p-4">
                {!showParticipants ? (
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

              {/* Chat Input */}
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
