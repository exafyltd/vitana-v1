import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Leaf, Clock, TrendingUp, Settings } from "lucide-react";
import { MentalPlanData } from "@/types/mental";
import { Progress } from "@/components/ui/progress";
import { t } from '@/lib/i18n-toast';

interface MentalOverviewCardProps {
  planData: MentalPlanData;
  onRecalibrate?: () => void;
}

export function MentalOverviewCard({ planData, onRecalibrate }: MentalOverviewCardProps) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to border border-border/60">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {t('screens.health.yourMentalPlanPoweredByAutopilot')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('screens.health.aiguidedInsightsHelpYouManageStress')}
            </p>
          </div>
          <Badge variant="secondary" className="bg-card/70 backdrop-blur-md border border-border/60">
            <Brain className="w-3 h-3 me-1 animate-pulse" />
            {t('screens.health.aiOptimized')}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card/70 backdrop-blur-md rounded-xl p-4 border border-border/60 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-status-success" />
              <span className="text-sm font-medium text-muted-foreground">{t('screens.health.goalFocus')}</span>
            </div>
            <p className="text-base font-semibold">{planData.goal}</p>
          </div>

          <div className="bg-card/70 backdrop-blur-md rounded-xl p-4 border border-border/60 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-status-warning" />
              <span className="text-sm font-medium text-muted-foreground">{t('screens.health.schedule')}</span>
            </div>
            <p className="text-base font-semibold">{planData.schedule}</p>
          </div>

          <div className="bg-card/70 backdrop-blur-md rounded-xl p-4 border border-border/60 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-category-1" />
              <span className="text-sm font-medium text-muted-foreground">{t('screens.health.programProgress')}</span>
            </div>
            <p className="text-base font-semibold">{t('screens.health.progresstextCompletionComplete', { progressText: planData.progressText, completion: planData.completion })}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('screens.health.trackingYourAverageMentalBalanceFocus')}
          </p>
          <Progress 
            value={planData.completion} 
            className="h-2 bg-muted/50"
          />
        </div>

        {/* AI Insight */}
        <div className="bg-card/60 rounded-xl backdrop-blur-md p-4 border border-border/60 shadow-sm">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-category-4 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium italic text-muted-foreground/90">
                {planData.aiInsight}
              </p>
              <p className="text-xs text-muted-foreground mt-2">{t('screens.health.lastUpdatedLastupdated', { lastUpdated: planData.lastUpdated })}</p>
            </div>
          </div>
        </div>

        {/* Recalibrate Button */}
        <div className="pt-2 space-y-3">
          <Button 
            variant="outline" 
            className="w-full bg-card/70 backdrop-blur-md border border-border/60"
            onClick={onRecalibrate}
          >
            <Settings className="w-4 h-4 me-2" />
            {t('screens.health.recalibratePlan')}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {t('screens.health.recalibrationAdjustsYourMentalGoalsBased')}
          </p>
        </div>
      </div>
    </Card>
  );
}
