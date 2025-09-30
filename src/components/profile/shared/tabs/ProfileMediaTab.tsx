import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Headphones, Music, Play, Eye, Users } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface ProfileMediaTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
}

export function ProfileMediaTab({ profile, scope, editMode }: ProfileMediaTabProps) {
  // Mock media content - replace with real data
  const mockMedia = [
    {
      id: '1',
      type: 'video',
      title: '15-Minute Morning Flow',
      thumbnail: profile.avatarUrl || '/placeholder.svg',
      duration: '15:23',
      views: 2300,
      date: '2 days ago'
    },
    {
      id: '2',
      type: 'podcast',
      title: 'Finding Inner Peace',
      thumbnail: profile.avatarUrl || '/placeholder.svg',
      duration: '32:15',
      plays: 890,
      date: '1 week ago'
    },
    {
      id: '3',
      type: 'music',
      title: 'Meditation Sounds',
      thumbnail: profile.avatarUrl || '/placeholder.svg',
      duration: '8:45',
      plays: 456,
      date: '2 weeks ago'
    }
  ];

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'podcast': return <Headphones className="h-4 w-4" />;
      case 'music': return <Music className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const getMetricIcon = (type: string) => {
    return type === 'video' ? <Eye className="h-3 w-3" /> : <Users className="h-3 w-3" />;
  };

  const getMetricCount = (item: any) => {
    return item.views || item.plays || 0;
  };

  return (
    <div className="w-full max-w-3xl mx-auto grid gap-4 md:grid-cols-2">
      {mockMedia.map((item) => (
        <Card key={item.id} className="group cursor-pointer hover:shadow-md transition-shadow">
          <div className="relative">
            <img 
              src={item.thumbnail} 
              alt={item.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Play className="h-6 w-6 text-white ml-1" />
              </div>
            </div>
            <Badge variant="secondary" className="absolute bottom-2 right-2 text-xs">
              {item.duration}
            </Badge>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-2 mb-2">
              {getMediaIcon(item.type)}
              <h3 className="font-medium text-sm line-clamp-2 flex-1">{item.title}</h3>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {getMetricIcon(item.type)}
                {getMetricCount(item).toLocaleString()}
              </div>
              <span>{item.date}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}