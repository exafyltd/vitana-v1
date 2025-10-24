import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Crown, Shield } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface ProfileGroupsTabProps {
  profile: UserProfile;
  scope: Scope;
}

export function ProfileGroupsTab({ profile }: ProfileGroupsTabProps) {
  // Mock communities data - replace with real data
  const mockCommunities = [
    { 
      id: '1', 
      name: 'Mindful Movement', 
      members: 1250, 
      type: 'group',
      role: 'admin',
      description: 'A community focused on mindful movement and wellness practices.',
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
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'moderator': return <Shield className="h-4 w-4 text-blue-600" />;
      default: return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'moderator': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
            className="group relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-2xl border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-300"
          >
            {/* Gradient accent border */}
            <div className={`absolute inset-0 bg-gradient-to-br ${community.gradient} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300`} />
            
            <div className="relative p-6 space-y-4">
              {/* Header with icon and role badge */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-12 h-12 bg-gradient-to-br ${community.gradient} rounded-xl flex items-center justify-center shadow-sm`}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{community.name}</h3>
                    <p className="text-sm text-muted-foreground/80">
                      {community.members.toLocaleString()} members
                    </p>
                  </div>
                </div>
                <Badge className={getRoleColor(community.role)} variant="outline">
                  <div className="flex items-center gap-1">
                    {getRoleIcon(community.role)}
                    <span className="capitalize text-xs">{community.role}</span>
                  </div>
                </Badge>
              </div>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground/80 line-clamp-2">
                {community.description}
              </p>
              
              {/* Member avatars collage */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {community.avatars.slice(0, 4).map((member, idx) => (
                    <Avatar 
                      key={idx}
                      className="w-8 h-8 border-2 border-white shadow-sm ring-1 ring-black/5"
                    >
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-violet-100 to-sky-100 text-violet-700">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {community.avatars.length > 4 && (
                  <span className="text-xs text-muted-foreground/70">
                    +{community.avatars.length - 4} more
                  </span>
                )}
              </div>
              
              {/* Footer with type and action */}
              <div className="flex items-center justify-between pt-2">
                <Badge variant="secondary" className="capitalize text-xs">
                  {community.type}
                </Badge>
                <Button 
                  size="sm"
                  className={`rounded-full bg-gradient-to-r ${community.gradient} hover:opacity-90 text-white border-0 shadow-sm px-4`}
                >
                  View {community.type === 'group' ? 'Group' : 'Event'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}