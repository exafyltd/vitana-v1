import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain } from "lucide-react";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { t } from '@/lib/i18n-toast';

interface VitanaScoreTooltipProps {
  score: number;
  children: React.ReactNode;
}

export function VitanaScoreTooltip({ score, children }: VitanaScoreTooltipProps) {
  const tier = getVitanaIndexTier(score);
  
  // Mock pillar contributions
  const pillars = [
    { name: "Sleep", score: 156, percentage: 21 },
    { name: "Exercise", score: 148, percentage: 20 },
    { name: "Nutrition", score: 145, percentage: 19.5 },
    { name: "Hydration", score: 142, percentage: 19.1 },
    { name: "Mental", score: 138, percentage: 18.6 },
    { name: "Supplements", score: 13, percentage: 1.8 }
  ];
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="w-80 p-4 bg-popover/95 backdrop-blur-sm border-border shadow-lg"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-semibold text-foreground">{t('screens.health.yourVitanaScoreBreakdown')}</h4>
            </div>
            
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-muted-foreground">{t('screens.health.overallScore')}</span>
                <span className="text-2xl font-bold text-foreground">{score} / 999</span>
              </div>
              <div className="text-xs text-muted-foreground">{t('screens.health.tier')} <span className="font-semibold" style={{ color: tier.color }}>{t(tier.labelKey)}</span>{t('screens.health.top68')}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-foreground mb-2">{t('screens.health.pillarContributions')}</div>
              <div className="space-y-2">
                {pillars.map((pillar) => (
                  <div key={pillar.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{pillar.name}</span>
                      <span className="text-foreground font-medium">
                        {pillar.score} ({pillar.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                        style={{ width: `${pillar.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">{t('screens.health.highestImpactToday')}</div>
              <div className="text-sm font-medium text-foreground">
                {t('screens.health.sleepConsistencyExerciseRecovery')}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {t('screens.health.nextScoreUpdate23h12m')}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
