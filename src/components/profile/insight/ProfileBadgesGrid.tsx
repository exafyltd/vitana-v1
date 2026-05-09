import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Trophy, 
  Star, 
  Flame, 
  Heart, 
  Users, 
  Target,
  Shield,
  Sparkles
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { t } from '@/lib/i18n-toast';

interface BadgeItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

interface ProfileBadgesGridProps {
  badges?: BadgeItem[];
  className?: string;
}

const defaultBadges: BadgeItem[] = [
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    icon: 'star',
    description: 'One of the first members of the community',
    color: 'from-amber-400 to-orange-500'
  },
  {
    id: '30-day-streak',
    name: '30-Day Streak',
    icon: 'flame',
    description: 'Maintained a 30-day wellness streak',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'top-contributor',
    name: 'Top Contributor',
    icon: 'trophy',
    description: 'Recognized for outstanding community contributions',
    color: 'from-violet-500 to-purple-600'
  },
  {
    id: 'helper',
    name: 'Community Helper',
    icon: 'heart',
    description: 'Helped 50+ community members',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: '100-posts',
    name: 'Content Creator',
    icon: 'target',
    description: 'Published 100+ posts',
    color: 'from-blue-500 to-sky-600'
  },
  {
    id: 'verified',
    name: 'Verified',
    icon: 'shield',
    description: 'Profile verified by VITANA',
    color: 'from-emerald-500 to-teal-600'
  }
];

const getIconComponent = (iconName: string) => {
  const icons: Record<string, typeof Award> = {
    award: Award,
    trophy: Trophy,
    star: Star,
    flame: Flame,
    heart: Heart,
    users: Users,
    target: Target,
    shield: Shield,
    sparkles: Sparkles
  };
  return icons[iconName] || Award;
};

export function ProfileBadgesGrid({ badges, className }: ProfileBadgesGridProps) {
  const displayBadges = badges && badges.length > 0 ? badges : defaultBadges;

  return (
    <Card className={`rounded-2xl shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-[hsl(var(--pill-mental-accent))]" />
          {t('screens.profile.badgesAchievements')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-3 gap-4">
            {displayBadges.map((badge) => {
              const IconComponent = getIconComponent(badge.icon);
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/50 border border-muted/30 hover:shadow-md transition-all cursor-pointer group">
                      <div className={`p-3 rounded-full bg-gradient-to-br ${badge.color} group-hover:scale-110 transition-transform`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-medium text-center line-clamp-2">
                        {badge.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">{badge.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
