import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { RewardDot } from "@/components/ui/reward-dot";
import { Mic, Video, Users, Clock, Star, Heart, MessageSquare, Calendar, Play } from "lucide-react";
import { t } from '@/lib/i18n-toast';
// Remove react-i18next import - not available

interface LiveRoom {
  id: string;
  title: string;
  description: string;
  host: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  participants: number;
  maxParticipants: number;
  category: string;
  tags: string[];
  scheduledTime?: string;
  isLive: boolean;
  duration: string;
  thumbnail: string;
  type: 'audio' | 'video' | 'mixed';
  premium: boolean;
}

const mockRooms: LiveRoom[] = [
  {
    id: "room-1",
    title: "Morning Meditation & Mindfulness",
    description: "Start your day with guided meditation and breathing exercises",
    host: {
      name: "Dr. Emma Wilson",
      avatar: "/lovable-uploads/emma-wilson-avatar.jpg",
      verified: true
    },
    participants: 24,
    maxParticipants: 50,
    category: "wellness",
    tags: ["Meditation", "Mindfulness", "Morning Routine"],
    scheduledTime: "8:00 AM",
    isLive: true,
    duration: "30 min",
    thumbnail: "/lovable-uploads/meditation-room.jpg",
    type: "audio",
    premium: false
  },
  {
    id: "room-2", 
    title: "Longevity Science Discussion",
    description: "Weekly discussion on latest longevity research and breakthroughs",
    host: {
      name: "Dr. James Davis",
      avatar: "/lovable-uploads/james-davis-avatar.jpg",
      verified: true
    },
    participants: 67,
    maxParticipants: 100,
    category: "education",
    tags: ["Science", "Research", "Longevity"],
    scheduledTime: "2:00 PM",
    isLive: false,
    duration: "60 min",
    thumbnail: "/lovable-uploads/science-room.jpg",
    type: "video",
    premium: true
  },
  {
    id: "room-3",
    title: "Community Check-in & Support",
    description: "Share your wellness journey and connect with like-minded people",
    host: {
      name: "Sarah Miller",
      avatar: "/lovable-uploads/sarah-miller-avatar.jpg",
      verified: false
    },
    participants: 15,
    maxParticipants: 30,
    category: "community",
    tags: ["Support", "Community", "Sharing"],
    isLive: true,
    duration: "45 min",
    thumbnail: "/lovable-uploads/community-room.jpg",
    type: "mixed",
    premium: false
  }
];

interface LiveRoomDirectoryProps {
  onJoinRoom: (room: LiveRoom) => void;
}

export default function LiveRoomDirectory({ onJoinRoom }: LiveRoomDirectoryProps) {
  const [activeTab, setActiveTab] = useState("live");

  const filteredRooms = mockRooms.filter(room => {
    const matchesTab = activeTab === "all" || 
                      (activeTab === "live" && room.isLive) ||
                      (activeTab === "scheduled" && !room.isLive);
    
    return matchesTab;
  });

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'audio': return <Mic className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'mixed': return <MessageSquare className="w-4 h-4" />;
      default: return <Mic className="w-4 h-4" />;
    }
  };

  const formatParticipants = (current: number, max: number) => {
    return `${current}/${max}`;
  };

  return (
    <div className="space-y-6">
      {/* Split Screen Navigation */}
      <SplitBar value={activeTab} onValueChange={setActiveTab}>
        <SplitBarList>
          <SplitBarTrigger value="live" className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            🔴 Live now
          </SplitBarTrigger>
          <SplitBarTrigger value="scheduled">{t('screens.community.scheduled')}</SplitBarTrigger>
          <SplitBarTrigger value="all">{t('screens.community.allRooms')}</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="live" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.filter(room => room.isLive).map(room => (
              <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
            ))}
          </div>
        </SplitBarContent>

        <SplitBarContent value="scheduled" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.filter(room => !room.isLive).map(room => (
              <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
            ))}
          </div>
        </SplitBarContent>

        <SplitBarContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map(room => (
              <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
            ))}
          </div>
        </SplitBarContent>
      </SplitBar>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('screens.community.noRoomsFound')}</h3>
          <p className="text-muted-foreground">{t('screens.community.tryAdjustingYourSearchFilters')}</p>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, onJoin }: { room: LiveRoom; onJoin: (room: LiveRoom) => void }) {
  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'audio': return <Mic className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'mixed': return <MessageSquare className="w-4 h-4" />;
      default: return <Mic className="w-4 h-4" />;
    }
  };

  const formatParticipants = (current: number, max: number) => {
    return `${current}/${max}`;
  };

  const getRewardPoints = () => {
    if (room.premium) return 8;
    if (room.isLive) return 6;
    return 4;
  };

  const getRewardDescription = () => {
    if (room.isLive) return "Join live session for bonus credits";
    return "Schedule participation for credits";
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group relative">
      <RewardDot 
        points={getRewardPoints()} 
        description={getRewardDescription()}
        position="top-right"
        size="sm"
      />
      <div className="relative overflow-hidden">
        <div 
          className="h-32 bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex items-center justify-center"
          style={{
            backgroundImage: room.thumbnail ? `url(${room.thumbnail})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {room.isLive && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
              LIVE
            </Badge>
          )}
          {room.premium && (
            <Badge className="absolute top-2 right-2 bg-yellow-500 text-white">
              <Star className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="sm" 
              className="bg-white/20 backdrop-blur-sm text-white border-white/30"
              onClick={() => onJoin(room)}
            >
              {room.isLive ? <Play className="w-4 h-4 mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
              {room.isLive ? 'Join' : 'Schedule'}
            </Button>
          </div>
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {room.title}
          </CardTitle>
          <div className="flex items-center gap-1 ml-2">
            {getRoomTypeIcon(room.type)}
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {room.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Host */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={room.host.avatar} />
            <AvatarFallback>{room.host.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium truncate">{room.host.name}</p>
              {room.host.verified && (
                <Badge variant="secondary" className="h-4 w-4 p-0 rounded-full">
                  <Heart className="w-3 h-3 text-blue-600" />
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{formatParticipants(room.participants, room.maxParticipants)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {room.isLive ? (
                <span>{room.duration}</span>
              ) : (
                <span>{room.scheduledTime}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-1 flex-wrap">
          {room.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Join Button */}
        <Button 
          className="w-full" 
          variant={room.isLive ? "default" : "outline"}
          onClick={() => onJoin(room)}
        >
          {room.isLive ? (
            <>
              <Play className="w-4 h-4 mr-2" />
              Join Room
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Set Reminder
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}