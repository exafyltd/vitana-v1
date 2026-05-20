import { Users, ChevronRight, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserGroups } from "@/hooks/useUserGroups";
import { Skeleton } from "@/components/ui/skeleton";

import { fmtNumber } from '@/lib/locale-format';
interface MobileGroupsTabContentProps {
  userId?: string;
  className?: string;
}

export function MobileGroupsTabContent({ 
  userId,
  className 
}: MobileGroupsTabContentProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { data: groups = [], isLoading } = useUserGroups(userId);
  const hasGroups = groups.length > 0;
  const previewGroups = groups.slice(0, 3);

  const handleViewAll = () => {
    navigate('/comm/groups');
  };

  const handleDiscover = () => {
    navigate('/comm/groups?discover=true');
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/comm/groups/${groupId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("p-4 space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!hasGroups) {
    return (
      <div className={cn("p-4", className)}>
        <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary/50" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-medium text-foreground">
              {translate('profileGroups.emptyTitle', 'No groups yet')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {translate('profileGroups.emptyDescription', 'Join communities that match your interests')}
            </p>
          </div>
          <Button 
            onClick={handleDiscover}
            className="mt-2"
            size="sm"
          >
            <Compass className="h-4 w-4 mr-2" />
            {translate('profileGroups.discoverCta', 'Discover Groups')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 space-y-3", className)}>
      {/* Groups List */}
      <div className="space-y-2">
        {previewGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleGroupClick(group.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-card/80 border border-border/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Avatar className="h-12 w-12 rounded-xl shrink-0">
              <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
              <AvatarFallback className="rounded-xl text-sm font-medium bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground truncate">
                {group.name}
              </h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Users className="h-3 w-3" />
                {fmtNumber(group.member_count)} {translate('profileGroups.membersLabel', 'members')}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      {/* CTAs */}
      <div className="space-y-2 pt-1">
        <button
          onClick={handleViewAll}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card/50 hover:bg-card/80 border border-border/50 transition-colors text-sm font-medium text-foreground"
        >
          {translate('profileGroups.viewAllCta', 'View all groups')}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <button
          onClick={handleDiscover}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-colors text-sm font-medium text-primary"
        >
          <Compass className="h-4 w-4" />
          {translate('profileGroups.discoverCta', 'Discover groups')}
        </button>
      </div>
    </div>
  );
}
