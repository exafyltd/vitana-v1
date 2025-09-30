import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      description: 'A community focused on mindful movement and wellness practices.'
    },
    { 
      id: '2', 
      name: 'Morning Yoga Sessions', 
      members: 850, 
      type: 'event',
      role: 'member',
      description: 'Join us for daily morning yoga sessions and start your day right.'
    },
    { 
      id: '3', 
      name: 'Wellness Warriors', 
      members: 2100, 
      type: 'group',
      role: 'moderator',
      description: 'Warriors on the path to optimal health and wellness.'
    }
  ];

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
    <div className="w-full max-w-3xl mx-auto grid gap-4 md:grid-cols-2">
      {mockCommunities.map((community) => (
        <Card key={community.id} className="p-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{community.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {community.members.toLocaleString()} members
                  </p>
                </div>
              </div>
              <Badge className={getRoleColor(community.role)} variant="outline">
                <div className="flex items-center gap-1">
                  {getRoleIcon(community.role)}
                  <span className="capitalize">{community.role}</span>
                </div>
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {community.description}
            </p>
            
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="capitalize">
                {community.type}
              </Badge>
              <Button variant="outline" size="sm">
                View {community.type === 'group' ? 'Group' : 'Event'}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}