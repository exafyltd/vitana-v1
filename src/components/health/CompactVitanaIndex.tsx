import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { t } from '@/lib/i18n-toast';

interface CompactVitanaIndexProps {
  score: number;
  trend?: "up" | "down" | "stable";
  pillars?: {
    nutrition: number;
    hydration: number;
    exercise: number;
    sleep: number;
    mental: number;
  };
}

export default function CompactVitanaIndex({ score, trend = "up", pillars }: CompactVitanaIndexProps) {
  const tier = getVitanaIndexTier(score);
  
  const pillarData = pillars || {
    nutrition: 85,
    hydration: 72,
    exercise: 68,
    sleep: 90,
    mental: 78
  };

  return (
    <Card className="h-full bg-card ring-1 ring-border/60 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
      <CardHeader>
        <CardTitle className="text-lg">{t('screens.health.vitanaIndex')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Circular Score Display */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">{score}</div>
                <div className="text-xs text-muted-foreground">{t('screens.health.text999')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Trend */}
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="text-sm">
            {tier.label}
          </Badge>
          <div className="flex items-center justify-center gap-2 text-sm">
            {trend === "up" && (
              <>
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-600">Improving</span>
              </>
            )}
            {trend === "down" && (
              <>
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-red-600">Declining</span>
              </>
            )}
            {trend === "stable" && (
              <span className="text-muted-foreground">Stable</span>
            )}
          </div>
        </div>

        {/* Mini Pillar Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-2">{t('screens.health.healthPillars')}</div>
          {Object.entries(pillarData).map(([name, value]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span className="capitalize text-muted-foreground">{name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8 text-right">{value}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
