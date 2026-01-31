import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { applyReplacements } from "@/lib/i18n-helpers";

interface CampaignCreationHeaderProps {
  currentStep: number;
  draftsCount?: number;
  liveCount?: number;
}

export function CampaignCreationHeader({ 
  currentStep, 
  draftsCount = 0, 
  liveCount = 0 
}: CampaignCreationHeaderProps) {
  const { translate } = useTranslation();

  const getStepTip = (step: number): string => {
    const tipKey = `campaigns.creation.tips.${step}`;
    const fallbacks: Record<number, string> = {
      1: "Clear names help you find campaigns later",
      2: "Connect channels now for instant scheduling",
      3: "Launch template works for most announcements",
      4: "Smart scheduling uses your past engagement data"
    };
    return translate(tipKey, fallbacks[step] || "");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Current Step Context */}
      <Card className="bg-card/80 backdrop-blur-sm border-2 border-border shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🪄</div>
            <div>
              <h3 className="font-bold text-lg">{translate('campaigns.creation.title', 'Create Campaign')}</h3>
              <p className="text-xs text-muted-foreground">
                {applyReplacements(translate('campaigns.creation.stepOf', 'Step {current} of {total}'), { current: currentStep, total: 4 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Campaign Stats */}
      <Card className="bg-card/80 backdrop-blur-sm border-2 border-border shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{translate('campaigns.creation.yourCampaigns', 'Your Campaigns')}</p>
              <p className="text-2xl font-bold">{draftsCount + liveCount}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {draftsCount} {translate('campaigns.creation.drafts', 'drafts')}
              </Badge>
              <Badge variant="default" className="text-xs bg-[hsl(var(--pill-nutrition-accent))] hover:bg-[hsl(var(--pill-nutrition-accent))]/90">
                {liveCount} {translate('campaigns.creation.live', 'live')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Quick Tip */}
      <Card className="bg-gradient-to-br from-[hsl(var(--pill-hydration-tint))] to-[hsl(var(--pill-mental-tint))] backdrop-blur-sm border-2 border-[hsl(var(--pill-hydration-accent))]/30 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-[hsl(var(--pill-hydration-accent))] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">{translate('campaigns.creation.proTip', 'Pro Tip')}</p>
              <p className="text-xs text-muted-foreground">{getStepTip(currentStep)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
