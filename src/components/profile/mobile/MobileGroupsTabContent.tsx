import { Users, ChevronRight, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateGroupImage } from "@/lib/groupCardTransformers";

interface GroupItem {
  id: string;
  name: string;
  avatar_url?: string | null;
  members?: number;
  gradient?: string;
}

interface MobileGroupsTabContentProps {
  groups?: GroupItem[];
  className?: string;
}

// Placeholder groups for demo with wellness-themed images
const PLACEHOLDER_GROUPS: GroupItem[] = [
  {
    id: '1',
    name: 'Mindful Movement',
    avatar_url: generateGroupImage('1'),
    members: 1250,
    gradient: 'from-violet-400 to-purple-500'
  },
  {
    id: '2',
    name: 'Morning Yoga Sessions',
    avatar_url: generateGroupImage('2'),
    members: 850,
    gradient: 'from-amber-400 to-orange-500'
  },
  {
    id: '3',
    name: 'Wellness Warriors',
    avatar_url: generateGroupImage('3'),
    members: 2100,
    gradient: 'from-emerald-400 to-teal-500'
  }
];

export function MobileGroupsTabContent({ 
  groups = PLACEHOLDER_GROUPS,
  className 
}: MobileGroupsTabContentProps) {
  const navigate = useNavigate();
  const hasGroups = groups.length > 0;
  const previewGroups = groups.slice(0, 3);

  const handleViewAll = () => {
    navigate('/community/groups');
  };

  const handleDiscover = () => {
    navigate('/community/groups?discover=true');
  };

  const handleGroupClick = (group: GroupItem) => {
    navigate(`/community/groups/${group.id}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Empty state
  if (!hasGroups) {
    return (
      <div className={cn("p-4", className)}>
        <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary/50" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-medium text-foreground">No groups yet</h3>
            <p className="text-sm text-muted-foreground">
              Join communities that match your interests
            </p>
          </div>
          <Button 
            onClick={handleDiscover}
            className="mt-2"
            size="sm"
          >
            <Compass className="h-4 w-4 mr-2" />
            Discover Groups
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
            onClick={() => handleGroupClick(group)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-card/80 border border-border/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Avatar className="h-12 w-12 rounded-xl shrink-0">
              <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
              <AvatarFallback className={cn(
                "rounded-xl text-white text-sm font-medium bg-gradient-to-br",
                group.gradient || "from-primary to-primary/80"
              )}>
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground truncate">
                {group.name}
              </h4>
              {group.members && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Users className="h-3 w-3" />
                  {group.members.toLocaleString()} members
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      {/* CTAs */}
      <div className="space-y-2 pt-1">
        {/* View all groups */}
        <button
          onClick={handleViewAll}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card/50 hover:bg-card/80 border border-border/50 transition-colors text-sm font-medium text-foreground"
        >
          View all groups
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Discover groups */}
        <button
          onClick={handleDiscover}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-colors text-sm font-medium text-primary"
        >
          <Compass className="h-4 w-4" />
          Discover groups
        </button>
      </div>
    </div>
  );
}
