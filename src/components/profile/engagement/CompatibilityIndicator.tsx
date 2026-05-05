import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Target, Users, Zap } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CompatibilityMatch {
  type: 'wellness' | 'interests' | 'goals' | 'lifestyle';
  percentage: number;
  sharedItems: string[];
  icon: React.ReactNode;
}

interface CompatibilityIndicatorProps {
  isOwnProfile?: boolean;
  matches?: CompatibilityMatch[];
  mutualConnections?: number;
  className?: string;
}

export function CompatibilityIndicator({ 
  isOwnProfile = false, 
  matches = [],
  mutualConnections = 0,
  className 
}: CompatibilityIndicatorProps) {
  // Mock data for demonstration
  const defaultMatches: CompatibilityMatch[] = [
    {
      type: 'wellness',
      percentage: 92,
      sharedItems: ['Yoga', 'Meditation', 'Nutrition tracking'],
      icon: <Heart className="h-3 w-3" />
    },
    {
      type: 'goals',
      percentage: 85,
      sharedItems: ['Weight loss', 'Stress reduction', 'Better sleep'],
      icon: <Target className="h-3 w-3" />
    },
    {
      type: 'interests',
      percentage: 78,
      sharedItems: ['Mindfulness', 'Outdoor activities', 'Healthy cooking'],
      icon: <Zap className="h-3 w-3" />
    }
  ];

  const finalMatches = matches.length > 0 ? matches : defaultMatches;

  // Don't show compatibility on own profile
  if (isOwnProfile) return null;

  const getCompatibilityColor = (percentage: number) => {
    if (percentage >= 85) return 'hsl(var(--domain-community-accent))';
    if (percentage >= 70) return 'hsl(var(--pill-mental-accent))';
    if (percentage >= 55) return 'hsl(var(--pill-nutrition-accent))';
    return 'hsl(var(--muted-foreground))';
  };

  const getCompatibilityLabel = (percentage: number) => {
    if (percentage >= 85) return 'Highly Compatible';
    if (percentage >= 70) return 'Good Match';
    if (percentage >= 55) return 'Some Compatibility';
    return 'Limited Match';
  };

  const topMatch = finalMatches.reduce((prev, current) => 
    (prev.percentage > current.percentage) ? prev : current
  );

  return (
    <Card className={`rounded-xl border-2 shadow-sm ${className}`} 
          style={{ borderColor: `${getCompatibilityColor(topMatch.percentage)}20` }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="rounded-full p-1.5"
              style={{ 
                backgroundColor: `${getCompatibilityColor(topMatch.percentage)}15`,
                border: `1px solid ${getCompatibilityColor(topMatch.percentage)}30`
              }}
            >
              {topMatch.icon}
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: getCompatibilityColor(topMatch.percentage) }}>
                {topMatch.percentage}% {getCompatibilityLabel(topMatch.percentage)}
              </div>
              <div className="text-xs text-muted-foreground capitalize">{t('screens.profile.typeAlignment', { type: topMatch.type })}
              </div>
            </div>
          </div>
          
          {mutualConnections > 0 && (
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />{t('screens.profile.mutualconnectionsMutual', { mutualConnections })}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{t('screens.profile.sharedInterests')}</div>
          <div className="flex flex-wrap gap-1">
            {topMatch.sharedItems.slice(0, 3).map((item, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs bg-background border"
              >
                {item}
              </Badge>
            ))}
            {topMatch.sharedItems.length > 3 && (
              <Badge variant="outline" className="text-xs">{t('screens.profile.value0More', { value0: topMatch.sharedItems.length - 3 })}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}