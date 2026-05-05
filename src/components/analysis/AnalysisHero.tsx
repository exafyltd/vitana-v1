import { useState, useEffect } from "react";
import { TrendingUp, Zap, ArrowUp, Users, UserCheck, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

interface AnalysisHeroProps {
  overallScore: number;
  topFactors: string[];
  sharedInterests: string[];
  weekDelta: number;
  onContextChange?: (context: 'people' | 'coaches' | 'groups' | 'events') => void;
}

export function AnalysisHero({ 
  overallScore, 
  topFactors, 
  sharedInterests,
  weekDelta,
  onContextChange 
}: AnalysisHeroProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [activeContext, setActiveContext] = useState<'people' | 'coaches' | 'groups' | 'events'>('people');

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = overallScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= overallScore) {
        setAnimatedScore(overallScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [overallScore]);

  const handleContextChange = (context: 'people' | 'coaches' | 'groups' | 'events') => {
    setActiveContext(context);
    onContextChange?.(context);
  };

  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - animatedScore / 100);

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-background via-pink-50/50 to-fuchsia-50/50 dark:from-background dark:via-pink-950/20 dark:to-fuchsia-950/20 backdrop-blur-xl border border-border/50 shadow-[0_0_60px_rgba(236,72,153,0.15)]">
      {/* Decorative animated glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent mb-2">
            {t('screens.analysis.yourCompatibilityOverview')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('screens.analysis.aipoweredInsightsBasedYourProfileInterests')}
          </p>
        </div>
        
        {/* Main Content: Gauge + Factors */}
        <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-8">
          {/* Left: Large Circular Gauge */}
          <div className="flex-shrink-0">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle 
                  cx="96" 
                  cy="96" 
                  r="70" 
                  className="stroke-muted/30" 
                  strokeWidth="12" 
                  fill="none" 
                />
                <circle 
                  cx="96" 
                  cy="96" 
                  r="70" 
                  className="stroke-pink-500"
                  strokeWidth="12" 
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{ 
                    transition: 'stroke-dashoffset 0.5s ease-out',
                    filter: 'drop-shadow(0 0 12px rgba(236, 72, 153, 0.6))'
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
                  {animatedScore}%
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-3">
              {t('screens.analysis.overallCompatibility')}
            </p>
          </div>
          
          {/* Right: Top Factors + Growth */}
          <div className="flex-1 space-y-6 w-full">
            {/* Top Match Factors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold">{t('screens.analysis.topMatchFactors')}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {topFactors.map((factor, index) => (
                  <Badge 
                    key={index}
                    variant="outline" 
                    className="px-4 py-2 text-sm bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 border-pink-500/20 backdrop-blur-sm"
                  >
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Shared Interests */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-amber-500/20">
                  <Zap className="w-5 h-5 text-fuchsia-600" />
                </div>
                <h3 className="text-lg font-semibold">{t('screens.analysis.sharedInterests')}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {sharedInterests.map((interest, index) => (
                  <Badge 
                    key={index}
                    variant="outline" 
                    className="px-4 py-2 text-sm bg-gradient-to-r from-fuchsia-500/10 to-amber-500/10 border-fuchsia-500/20 backdrop-blur-sm"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Growth Trend */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('screens.analysis.thisWeekSGrowth')}</span>
                <span className="text-sm text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                  <ArrowUp className="w-4 h-4" />
                  +{weekDelta}%
                </span>
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-amber-500 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.5)]" 
                  style={{ width: `${overallScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Context Switcher Tabs */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
          <Button 
            variant={activeContext === 'people' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleContextChange('people')}
            className="text-xs"
          >
            <Users className="w-3 h-3 mr-1" />
            {t('screens.analysis.people')}
          </Button>
          <Button 
            variant={activeContext === 'coaches' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleContextChange('coaches')}
            className="text-xs"
          >
            <UserCheck className="w-3 h-3 mr-1" />
            {t('screens.analysis.coaches')}
          </Button>
          <Button 
            variant={activeContext === 'groups' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleContextChange('groups')}
            className="text-xs"
          >
            <Users className="w-3 h-3 mr-1" />
            {t('screens.analysis.groups')}
          </Button>
          <Button 
            variant={activeContext === 'events' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleContextChange('events')}
            className="text-xs"
          >
            <Calendar className="w-3 h-3 mr-1" />
            {t('screens.analysis.events')}
          </Button>
        </div>
      </div>
    </div>
  );
}
