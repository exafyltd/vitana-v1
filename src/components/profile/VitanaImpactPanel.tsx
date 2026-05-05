import { Badge } from "@/components/ui/badge";
import { Users, Heart, Share2, TrendingUp, Sparkles } from "lucide-react";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { t } from '@/lib/i18n-toast';

interface VitanaImpactPanelProps {
  vitanaIndex: number;
  communityStats: {
    posts: number;
    helpedUsers: number;
    featuredStories: number;
    influenceScore: number;
  };
  className?: string;
}

export function VitanaImpactPanel({ 
  vitanaIndex, 
  communityStats,
  className 
}: VitanaImpactPanelProps) {
  const tier = getVitanaIndexTier(vitanaIndex);
  const percentage = Math.round((vitanaIndex / 999) * 100);
  
  const getInfluenceLevel = (score: number) => {
    if (score >= 80) return { label: "Community Leader", gradient: "from-[hsl(var(--domain-community-accent))] to-[hsl(var(--pill-mental-accent))]" };
    if (score >= 60) return { label: "Active Contributor", gradient: "from-[hsl(var(--util-profile-accent))] to-[hsl(var(--pill-hydration-accent))]" };
    if (score >= 40) return { label: "Emerging Voice", gradient: "from-[hsl(var(--pill-hydration-accent))] to-[hsl(var(--pill-nutrition-accent))]" };
    return { label: "Getting Started", gradient: "from-gray-400 to-gray-500" };
  };

  const influence = getInfluenceLevel(communityStats.influenceScore);

  return (
    <div className={`relative rounded-3xl bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-900/80 dark:via-gray-900/60 dark:to-gray-900/40 backdrop-blur-xl border border-white/30 dark:border-gray-800/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)] ${className}`}>
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/5 via-transparent to-[hsl(var(--pill-mental-accent))]/5 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/20 to-[hsl(var(--pill-nutrition-accent))]/20 flex items-center justify-center border border-[hsl(var(--sys-vitana-accent))]/30 shadow-sm">
              <Sparkles className="w-5 h-5 text-[hsl(var(--sys-vitana-accent))]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{t('screens.profile.vitanaImpact')}</h3>
              <p className="text-xs text-muted-foreground">{t('screens.profile.yourWellnessInfluence')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Radial Vitana Index Gauge */}
          <div className="relative flex items-center justify-center p-6">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/20 to-[hsl(var(--pill-nutrition-accent))]/20 blur-2xl animate-pulse" />
              
              {/* SVG Radial Gauge */}
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                {/* Background circle */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-gray-200 dark:text-gray-700"
                  opacity="0.3"
                />
                {/* Progress circle */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="url(#vitanaGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - percentage / 100)}`}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 8px hsl(var(--sys-vitana-accent) / 0.4))'
                  }}
                />
                <defs>
                  <linearGradient id="vitanaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--sys-vitana-accent))" />
                    <stop offset="100%" stopColor="hsl(var(--pill-nutrition-accent))" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] bg-clip-text text-transparent">
                  {vitanaIndex}
                </div>
                <div className="text-xs font-semibold text-muted-foreground mt-1">
                  {t('screens.profile.vitanaIndex')}
                </div>
                <Badge 
                  variant="outline" 
                  className="mt-2 text-[10px] px-2 py-0.5 border-[hsl(var(--sys-vitana-accent))]/30 bg-[hsl(var(--sys-vitana-accent))]/10 text-[hsl(var(--sys-vitana-accent))]"
                  style={{ backgroundColor: tier.color + '20' }}
                >
                  {tier.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Influence & Stats */}
          <div className="space-y-4">
            {/* Gradient Influence Chip */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--domain-community-accent))]/20 to-[hsl(var(--pill-mental-accent))]/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <div className={`relative rounded-2xl bg-gradient-to-r ${influence.gradient} p-[1px] shadow-lg`}>
                <div className="rounded-2xl bg-white dark:bg-gray-900 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${influence.gradient} flex items-center justify-center shadow-lg`}>
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('screens.profile.yourInfluence')}</div>
                      <div className={`text-lg font-bold bg-gradient-to-r ${influence.gradient} bg-clip-text text-transparent`}>
                        {influence.label}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat Chips Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* People Helped */}
              <div className="rounded-2xl bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--domain-community-accent))]/20 to-[hsl(var(--domain-community-accent))]/10 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-[hsl(var(--domain-community-accent))]" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{communityStats.helpedUsers}</div>
                  <div className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{t('screens.profile.peopleHelped')}</div>
                </div>
              </div>

              {/* Stories */}
              <div className="rounded-2xl bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--pill-sleep-accent))]/20 to-[hsl(var(--pill-sleep-accent))]/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[hsl(var(--pill-sleep-accent))]" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{communityStats.featuredStories}</div>
                  <div className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{t('screens.profile.stories')}</div>
                </div>
              </div>

              {/* Posts Shared */}
              <div className="rounded-2xl bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--util-profile-accent))]/20 to-[hsl(var(--util-profile-accent))]/10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-[hsl(var(--util-profile-accent))]" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{communityStats.posts}</div>
                  <div className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{t('screens.profile.postsShared')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
