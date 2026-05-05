import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles, TrendingUp, Users, Send, Link, Share2 } from "lucide-react";
import { useProactiveGrowth } from "@/hooks/useProactiveGrowth";
import { t } from '@/lib/i18n-toast';

const iconMap: Record<string, typeof Users> = {
  Users,
  Send,
  Link,
  Share2,
  Sparkles
};

export function GrowthNudge() {
  const { actions, loading, executeAction, dismissAction } = useProactiveGrowth();

  if (loading || actions.length === 0) return null;

  // Show only the highest priority action
  const topAction = actions.sort((a, b) => {
    const priorityMap = { high: 3, medium: 2, low: 1 };
    return priorityMap[b.priority] - priorityMap[a.priority];
  })[0];

  const IconComponent = iconMap[topAction.icon] || Sparkles;

  return (
    <div>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          
          <CardContent className="p-6 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => dismissAction(topAction.id)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                <IconComponent className="h-6 w-6 text-primary" />
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">
                      {t('screens.proactive.growthOpportunity')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{topAction.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {topAction.description}
                  </p>
                </div>

                {/* Educational benefit */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm font-medium text-foreground">
                    {topAction.benefit}
                  </p>
                </div>

                {/* Progress indicator if available */}
                {topAction.metadata?.currentCount !== undefined && topAction.metadata?.targetCount && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('screens.proactive.progress')}</span>
                      <span>{topAction.metadata.currentCount} / {topAction.metadata.targetCount}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, (topAction.metadata.currentCount / topAction.metadata.targetCount) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => executeAction(topAction.id)}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {topAction.cta}
                  </Button>
                  
                  {actions.length > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => dismissAction(topAction.id)}
                    >{t('screens.proactive.seeNextValue0More', { value0: actions.length - 1 })}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
