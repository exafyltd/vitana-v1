import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Users, 
  MessageSquare, 
  Settings, 
  PhoneOff, 
  Hand, 
  Heart, 
  ThumbsUp, 
  Smile,
  Send,
  MoreVertical,
  Volume2,
  VolumeX
} from "lucide-react";
import { t } from '@/lib/i18n-toast';
// Remove react-i18next import - not available

interface LiveRoomViewerProps {
  roomId: string;
  onLeave: () => void;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'reaction' | 'system';
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isHost: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
}

const mockParticipants: Participant[] = [
  {
    id: "p1",
    name: "Dr. Emma Wilson",
    avatar: "/lovable-uploads/emma-wilson-avatar.jpg",
    isMuted: false,
    isVideoOff: false,
    isHost: true,
    isHandRaised: false,
    isSpeaking: true
  },
  {
    id: "p2",
    name: "Mike Thompson",
    avatar: "/lovable-uploads/mike-thompson-avatar.jpg",
    isMuted: true,
    isVideoOff: false,
    isHost: false,
    isHandRaised: false,
    isSpeaking: false
  },
  {
    id: "p3",
    name: "Sarah Miller",
    avatar: "/lovable-uploads/sarah-miller-avatar.jpg",
    isMuted: true,
    isVideoOff: true,
    isHost: false,
    isHandRaised: true,
    isSpeaking: false
  }
];

const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    userId: "p2",
    userName: "Mike Thompson",
    avatar: "/lovable-uploads/mike-thompson-avatar.jpg",
    message: "Great session! This is very helpful.",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    type: 'message'
  },
  {
    id: "m2",
    userId: "p3",
    userName: "Sarah Miller",
    avatar: "/lovable-uploads/sarah-miller-avatar.jpg",
    message: "Can you share the research paper you mentioned?",
    timestamp: new Date(Date.now() - 1 * 60 * 1000),
    type: 'message'
  }
];

export default function LiveRoomViewer({ roomId, onLeave }: LiveRoomViewerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [participants, setParticipants] = useState<Participant[]>(mockParticipants);
  const [showParticipants, setShowParticipants] = useState(false);
  const [roomVolume, setRoomVolume] = useState(100);

  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: `m${Date.now()}`,
        userId: "current-user",
        userName: "You",
        avatar: "/placeholder-avatar.jpg",
        message: chatMessage.trim(),
        timestamp: new Date(),
        type: 'message'
      };
      setMessages(prev => [...prev, newMessage]);
      setChatMessage("");
    }
  };

  const sendReaction = (reaction: string) => {
    const reactionMessage: ChatMessage = {
      id: `r${Date.now()}`,
      userId: "current-user", 
      userName: "You",
      avatar: "/placeholder-avatar.jpg",
      message: reaction,
      timestamp: new Date(),
      type: 'reaction'
    };
    setMessages(prev => [...prev, reactionMessage]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <Badge variant="destructive" className="text-xs">{t('screens.community.live')}</Badge>
          </div>
          <h2 className="font-semibold">{t('screens.community.morningMeditationMindfulness')}</h2>
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {participants.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
          >
            <Users className="w-4 h-4 mr-2" />
            {t('screens.community.participants')}
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={onLeave}
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            {t('screens.community.leave')}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Video/Audio Area */}
          <div className="flex-1 bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 p-6">
            <div className="h-full rounded-lg bg-black/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              {/* Host Video/Avatar */}
              <div className="text-center">
                <div className="relative mb-4">
                  <Avatar className="h-32 w-32 mx-auto ring-4 ring-green-500 ring-offset-4">
                    <AvatarImage src="/lovable-uploads/emma-wilson-avatar.jpg" />
                    <AvatarFallback>{t('screens.community.ew')}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full">
                    <Mic className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground">{t('screens.community.drEmmaWilson')}</h3>
                <Badge className="mt-2">{t('screens.community.host')}</Badge>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 bg-card border-t">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isMuted ? "secondary" : "default"}
                size="lg"
                className="rounded-full w-12 h-12 p-0"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Button
                variant={isVideoOff ? "secondary" : "default"}
                size="lg"
                className="rounded-full w-12 h-12 p-0"
                onClick={() => setIsVideoOff(!isVideoOff)}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>

              <Button
                variant={isHandRaised ? "default" : "secondary"}
                size="lg"
                className="rounded-full w-12 h-12 p-0"
                onClick={() => setIsHandRaised(!isHandRaised)}
              >
                <Hand className="w-5 h-5" />
              </Button>

              <div className="flex items-center gap-2 px-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                  onClick={() => setRoomVolume(roomVolume > 0 ? 0 : 100)}
                >
                  {roomVolume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={roomVolume}
                  onChange={(e) => setRoomVolume(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Chat & Participants */}
        <div className="w-80 bg-card border-l flex flex-col">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t('screens.community.chat')}
              </h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={message.avatar} />
                      <AvatarFallback className="text-xs">
                        {message.userName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{message.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {message.type === 'reaction' ? (
                          <span className="text-lg">{message.message}</span>
                        ) : (
                          message.message
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t space-y-3">
              {/* Quick Reactions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 h-8 w-8"
                  onClick={() => sendReaction("👍")}
                >
                  👍
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 h-8 w-8"
                  onClick={() => sendReaction("❤️")}
                >
                  ❤️
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 h-8 w-8"
                  onClick={() => sendReaction("👏")}
                >
                  👏
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 h-8 w-8"
                  onClick={() => sendReaction("🙏")}
                >
                  🙏
                </Button>
              </div>

              {/* Message Input */}
              <div className="flex items-center gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button 
                  size="sm" 
                  onClick={sendMessage}
                  disabled={!chatMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Panel (Overlay) */}
        {showParticipants && (
          <div className="absolute right-80 top-16 bottom-0 w-80 bg-card border-l shadow-lg z-10">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{t('screens.community.participantsLength', { length: participants.length })}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParticipants(false)}
              >
                ×
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="text-xs">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {participant.isSpeaking && (
                        <div className="absolute -inset-1 rounded-full ring-2 ring-green-500 animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{participant.name}</p>
                        {participant.isHost && (
                          <Badge variant="secondary" className="text-xs">Host</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {participant.isMuted ? (
                          <MicOff className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Mic className="w-3 h-3 text-green-600" />
                        )}
                        {participant.isVideoOff ? (
                          <VideoOff className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Video className="w-3 h-3 text-blue-600" />
                        )}
                        {participant.isHandRaised && (
                          <Hand className="w-3 h-3 text-orange-600" />
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="p-1">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}