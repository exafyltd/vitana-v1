import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Crown, Shield } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface Community {
  id: string;
  name: string;
  members: number;
  type: 'group' | 'event';
  role: 'admin' | 'moderator' | 'member';
  description: string;
  cover_url?: string | null;
  avatar_url?: string | null;
  gradient: string;
  avatars: Array<{ name: string; avatar: string | null }>;
}

interface ProfileGroupsTabProps {
  profile: UserProfile;
  scope: Scope;
}

export function ProfileGroupsTab({ profile }: ProfileGroupsTabProps) {
  const mockCommunities: Community[] = [
    { 
      id: '1', 
      name: 'Mindful Movement', 
      members: 1250, 
      type: 'group',
      role: 'admin',
      description: 'A community focused on mindful movement and wellness practices.',
      cover_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
      avatar_url: null,
      gradient: 'from-violet-400 via-purple-400 to-sky-400',
      avatars: [
        { name: 'Alex M', avatar: null },
        { name: 'Sarah K', avatar: null },
        { name: 'John D', avatar: null },
        { name: 'Emma R', avatar: null },
      ]
    },
    { 
      id: '2', 
      name: 'Morning Yoga Sessions', 
      members: 850, 
      type: 'event',
      role: 'member',
      description: 'Join us for daily morning yoga sessions and start your day right.',
      cover_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
      avatar_url: null,
      gradient: 'from-amber-400 via-orange-400 to-rose-400',
      avatars: [
        { name: 'Maria L', avatar: null },
        { name: 'David P', avatar: null },
        { name: 'Lisa T', avatar: null },
      ]
    },
    { 
      id: '3', 
      name: 'Wellness Warriors', 
      members: 2100, 
      type: 'group',
      role: 'moderator',
      description: 'Warriors on the path to optimal health and wellness.',
      cover_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
      avatar_url: null,
      gradient: 'from-emerald-400 via-green-400 to-teal-400',
      avatars: [
        { name: 'Chris W', avatar: null },
        { name: 'Nina S', avatar: null },
        { name: 'Tom B', avatar: null },
        { name: 'Anna H', avatar: null },
      ]
    }
  ];

  const mockCommunityStats = {
    posts: 42,
    helpedUsers: 127,
    featuredStories: 3,
    influenceScore: 75
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'moderator': return <Shield className="h-4 w-4 text-blue-400" />;
      default: return <Users className="h-4 w-4 text-white/70" />;
    }
  };

  if (mockCommunities.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold flex items-center gap-2"><span>🌍</span><span>Active Communities</span></h2>
          <p className="text-sm text-muted-foreground/80 leading-[1.75] tracking-wide">Connect, collaborate, and grow together</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-100/50 to-sky-100/50 dark:from-white/5 dark:to-white/10 rounded-3xl backdrop-blur-xl flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <Users className="h-12 w-12 text-violet-400/60" />
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">You're not in any communities yet</h3>
            <p className="text-sm text-muted-foreground/80 max-w-sm leading-[1.75] tracking-wide">Explore wellness circles</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Section Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <span>🌍</span>
          <span>Active Communities</span>
        </h2>
        <p className="text-sm text-muted-foreground/80">
          Connect, collaborate, and grow together with like-minded wellness enthusiasts
        </p>
      </div>

      {/* Groups Grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {mockCommunities.map((community) => (
          <Card 
            key={community.id} 
            className="group relative overflow-hidden rounded-2xl border-0 h-80 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
          >
            {/* Background Image Layer */}
            {community.cover_url && (
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${community.cover_url})` }}
              />
            )}
            
            {/* Fallback gradient if no image */}
            {!community.cover_url && (
              <div className={`absolute inset-0 bg-gradient-to-br ${community.gradient}`} />
            )}
            
            {/* Gradient Overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
            
            {/* Content Layer */}
            <div className="relative h-full p-6 flex flex-col justify-between text-white">
              {/* Top section with role badge */}
              <div className="flex justify-end">
                <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30">
                  <div className="flex items-center gap-1">
                    {getRoleIcon(community.role)}
                    <span className="capitalize text-xs">{community.role}</span>
                  </div>
                </Badge>
              </div>
              
              {/* Bottom section with all info */}
              <div className="space-y-4">
                {/* Title and members */}
                <div>
                  <h3 className="font-bold text-2xl mb-1 drop-shadow-lg">
                    {community.name}
                  </h3>
                  <p className="text-sm text-white/90 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {community.members.toLocaleString()} members
                  </p>
                </div>
                
                {/* Description */}
                <p className="text-sm text-white/80 line-clamp-2 drop-shadow">
                  {community.description}
                </p>
                
                {/* Member avatars collage */}
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {community.avatars.slice(0, 3).map((member, idx) => (
                      <Avatar 
                        key={idx}
                        className="w-8 h-8 border-2 border-white shadow-sm"
                      >
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-violet-400 to-sky-400 text-white">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {community.avatars.length > 3 && (
                    <span className="text-xs text-white/70">
                      +{community.avatars.length - 3} more
                    </span>
                  )}
                </div>
                
                {/* Footer with type and action */}
                <div className="flex items-center justify-between pt-2">
                  <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white capitalize text-xs hover:bg-white/30">
                    {community.type}
                  </Badge>
                  <Button 
                    size="sm"
                    className="bg-white/90 hover:bg-white text-gray-900"
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}