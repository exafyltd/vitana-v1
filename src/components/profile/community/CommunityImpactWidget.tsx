import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Heart, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

interface CommunityImpactWidgetProps {
  vitanaIndex?: number;
  communityStats: {
    posts: number;
    helpedUsers: number;
    featuredStories: number;
    influenceScore: number;
  };
  className?: string;
}

export function CommunityImpactWidget({ 
  vitanaIndex = 78, 
  communityStats,
  className 
}: CommunityImpactWidgetProps) {
  const getInfluenceLevel = (score: number) => {
    if (score >= 80) return { label: "Community Leader", color: "hsl(var(--domain-community-accent))" };
    if (score >= 60) return { label: "Active Contributor", color: "hsl(var(--util-profile-accent))" };
    if (score >= 40) return { label: "Emerging Voice", color: "hsl(var(--pill-hydration-accent))" };
    return { label: "Getting Started", color: "hsl(var(--muted-foreground))" };
  };

  const influence = getInfluenceLevel(communityStats.influenceScore);

  return (
    <Card className={`rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] transition-all duration-300 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-purple-600 to-sky-600 bg-clip-text text-transparent">
          <div className="bg-gradient-to-br from-violet-400 to-sky-400 rounded-full p-2">
            <Users className="h-4 w-4 text-white" />
          </div>{t('screens.profile.communityImpact')}
        </CardTitle>
        <CardDescription>{t('screens.profile.yourInfluenceVitanaCommunity')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Vitana Index with enhanced visual */}
          <div className="rounded-xl border p-3 shadow-sm bg-gradient-to-br from-background to-background/50">
            <div className="flex items-center gap-2 mb-1">
              <div className="icon-vitana rounded-full p-1">
                <TrendingUp className="h-3 w-3" />
              </div>
              <div className="text-xs text-muted-foreground">{t('screens.profile.vitanaIndex')}</div>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-foreground">{vitanaIndex}</span>
              <Badge 
                variant="outline" 
                className="text-xs bg-[hsl(var(--sys-vitana-accent)/0.1)] border-[hsl(var(--sys-vitana-accent)/0.2)] text-[hsl(var(--sys-vitana-accent))]"
              >{t('screens.profile.text3ThisWeek')}
              </Badge>
            </div>
          </div>

          {/* Community Influence */}
          <div className="rounded-xl border p-3 shadow-sm bg-gradient-to-br from-background to-background/50">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="rounded-full p-1"
                style={{ 
                  backgroundColor: `${influence.color}15`, 
                  border: `1px solid ${influence.color}30` 
                }}
              >
                <Star className="h-3 w-3" style={{ color: influence.color }} />
              </div>
              <div className="text-xs text-muted-foreground">{t('screens.profile.influence')}</div>
            </div>
            <div className="text-lg font-semibold" style={{ color: influence.color }}>
              {influence.label}
            </div>
          </div>
        </div>

        {/* Impact Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="h-3 w-3 text-[hsl(var(--domain-community-accent))]" />
              <span className="text-lg font-bold text-foreground">{communityStats.helpedUsers}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('screens.profile.peopleHelped')}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-3 w-3 text-[hsl(var(--pill-sleep-accent))]" />
              <span className="text-lg font-bold text-foreground">{communityStats.featuredStories}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('screens.profile.featuredStories')}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-3 w-3 text-[hsl(var(--util-profile-accent))]" />
              <span className="text-lg font-bold text-foreground">{communityStats.posts}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('screens.profile.postsShared')}</div>
          </div>
        </div>

        {/* CTA */}
        <Button 
          size="sm" 
          className="w-full bg-gradient-to-r from-[hsl(var(--pill-mental-accent))] to-[hsl(var(--pill-nutrition-accent))] hover:from-[hsl(var(--pill-mental-accent)/0.9)] hover:to-[hsl(var(--pill-nutrition-accent)/0.9)] text-white border-0"
        >{t('screens.profile.shareYourSuccessStory')}
        </Button>
      </CardContent>
    </Card>
  );
}
