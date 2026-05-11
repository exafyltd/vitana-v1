import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

interface PillarData {
  nutrition: number;
  exercise: number;
  sleep: number;
  hydration: number;
  mental?: number;
}

// Static so Tailwind's JIT compiler keeps each class — `bg-pill-sleep-tint`
// in particular isn't used anywhere else and would otherwise be purged.
const PILLAR_TINT: Record<string, string> = {
  nutrition: "bg-pill-nutrition-tint",
  hydration: "bg-pill-hydration-tint",
  exercise: "bg-pill-exercise-tint",
  sleep: "bg-pill-sleep-tint",
  mental: "bg-pill-mental-tint",
};

interface MobileHealthSnapshotProps {
  vitanaIndex: number;
  vitanaPercentile?: number;
  trend: 'up' | 'down' | 'stable';
  pillars: PillarData;
}

export function MobileHealthSnapshot({ 
  vitanaIndex, 
  vitanaPercentile = 15, 
  trend, 
  pillars 
}: MobileHealthSnapshotProps) {
  const { translate } = useTranslation();
  const tier = getVitanaIndexTier(vitanaIndex);
  
  const getTierLabel = () => translate(tier.labelKey, tier.label);
  
  // Tile order matches the Index drawer.
  const PILLAR_CONFIG = [
    { key: 'nutrition', emoji: '🥗' },
    { key: 'hydration', emoji: '💧' },
    { key: 'exercise', emoji: '💪' },
    { key: 'sleep', emoji: '😴' },
    { key: 'mental', emoji: '🧠' },
  ] as const;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendLabel = trend === 'up' 
    ? translate('health.trend.improving')
    : trend === 'down' 
    ? translate('health.trend.declining') 
    : translate('health.trend.stable');

  return (
    <div className="mx-4 mt-0">
      <div className="rounded-2xl p-4 bg-card border border-border/60 shadow-sm">
        {/* Header */}
        <div className="text-center mb-3">
          <span className="text-base text-muted-foreground">🧬 {translate('health.healthSnapshot')}</span>
        </div>

        {/* Vitana Index — circle, mirroring the Index drawer */}
        <div className="flex flex-col items-center mb-3">
          <div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg"
            role="img"
            aria-label={`Vitana Index ${vitanaIndex} of 999`}
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 leading-none">
                {vitanaIndex}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t('screens.health.text999')}</div>
            </div>
          </div>

          {/* Status Text */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-muted-foreground text-sm">
              {translate('health.topPercentile').replace('{percent}', vitanaPercentile.toString())}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <div className="flex items-center gap-1">
              <TrendIcon className={`w-4 h-4 ${
                trend === 'up' ? 'text-emerald-600' :
                trend === 'down' ? 'text-red-500' :
                'text-muted-foreground'
              }`} />
              <span className={`text-sm ${
                trend === 'up' ? 'text-emerald-600' :
                trend === 'down' ? 'text-red-500' :
                'text-muted-foreground'
              }`}>
                {trendLabel}
              </span>
            </div>
          </div>

          {/* Tier Badge */}
          <div
            className="mt-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${tier.color}40`,
              color: 'hsl(var(--foreground))'
            }}
          >
            {getTierLabel()}
          </div>
        </div>

        {/* Pillar tiles — same shape as the Index drawer */}
        <div className="grid grid-cols-5 gap-1.5 mt-2">
          {PILLAR_CONFIG.map(({ key, emoji }) => {
            const value = pillars[key as keyof PillarData];
            if (value === undefined) return null;

            return (
              <div
                key={key}
                className={`${PILLAR_TINT[key]} rounded-xl px-1 py-2 flex flex-col items-center gap-0.5`}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="text-xs font-semibold text-foreground">{value}</span>
                <span className="text-[10px] text-muted-foreground">/200</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
