import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Video, Users, Clock, Search, Filter, Star, Heart, MessageSquare, Calendar, Play } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("live");

  const filteredRooms = mockRooms.filter(room => {
    const matchesSearch = room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || room.category === selectedCategory;
    
    const matchesTab = activeTab === "all" || 
                      (activeTab === "live" && room.isLive) ||
                      (activeTab === "scheduled" && !room.isLive);
    
    return matchesSearch && matchesCategory && matchesTab;
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
      {/* Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms, topics, or hosts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="wellness">Wellness</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="community">Community</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-96">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Live Now
          </TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="all">All Rooms</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.filter(room => room.isLive).map(room => (
              <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.filter(room => !room.isLive).map(room => (
              <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map(room => (
              <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No rooms found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
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

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <div className="relative">
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