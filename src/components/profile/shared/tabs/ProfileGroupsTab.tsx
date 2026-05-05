import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Crown, Shield } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { useUserGroups } from "@/hooks/useUserGroups";
import { generateGroupImage } from "@/lib/groupCardTransformers";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

interface ProfileGroupsTabProps {
  profile: UserProfile;
  scope: Scope;
}

export function ProfileGroupsTab({ profile }: ProfileGroupsTabProps) {
  const userId = profile.user_id || profile.id;
  const { data: groups = [], isLoading } = useUserGroups(userId);
  const navigate = useNavigate();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'moderator': return <Shield className="h-4 w-4 text-blue-400" />;
      default: return <Users className="h-4 w-4 text-white/70" />;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold flex items-center gap-2"><span>🌍</span><span>{t('screens.profile.activeCommunities')}</span></h2>
          <p className="text-sm text-muted-foreground/80 leading-[1.75] tracking-wide">{t('screens.profile.connectCollaborateGrowTogether')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl backdrop-blur-xl flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <Users className="h-12 w-12 text-primary/50" />
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-foreground">{t('screens.profile.youReNotAnyCommunitiesYet')}</h3>
            <p className="text-sm text-muted-foreground/80 max-w-sm leading-[1.75] tracking-wide">{t('screens.profile.exploreWellnessCircles')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <span>🌍</span>
          <span>{t('screens.profile.activeCommunities')}</span>
        </h2>
        <p className="text-sm text-muted-foreground/80">
          Connect, collaborate, and grow together with like-minded wellness enthusiasts
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {groups.map((group) => {
          const coverImage = group.cover_url || generateGroupImage(group.id);
          return (
            <Card 
              key={group.id} 
              className="group relative overflow-hidden rounded-2xl border-0 h-80 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/comm/groups/${group.id}`)}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${coverImage})` }}
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
              
              <div className="relative h-full p-6 flex flex-col justify-between text-white">
                <div className="flex justify-end">
                  <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30">
                    <div className="flex items-center gap-1">
                      {getRoleIcon(group.role)}
                      <span className="capitalize text-xs">{group.role}</span>
                    </div>
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-2xl mb-1 drop-shadow-lg">
                      {group.name}
                    </h3>
                    <p className="text-sm text-white/90 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {group.member_count.toLocaleString()} members
                    </p>
                  </div>
                  
                  {group.description && (
                    <p className="text-sm text-white/80 line-clamp-2 drop-shadow">
                      {group.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    {group.category && (
                      <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white capitalize text-xs hover:bg-white/30">
                        {group.category}
                      </Badge>
                    )}
                    <Button 
                      size="sm"
                      className="bg-white/90 hover:bg-white text-gray-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/comm/groups/${group.id}`);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
