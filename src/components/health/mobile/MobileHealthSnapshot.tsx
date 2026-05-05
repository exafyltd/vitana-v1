import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { useTranslation } from "@/hooks/useTranslation";

interface PillarData {
  nutrition: number;
  exercise: number;
  sleep: number;
  hydration: number;
  mental?: number;
}

// Static so Tailwind's JIT compiler keeps each class — template literals get
// purged for pillars not used elsewhere (hydration accent, sleep tint).
const PILLAR_CLASSES: Record<string, { text: string; tint: string; bar: string }> = {
  nutrition: {
    text: "text-pill-nutrition-accent",
    tint: "bg-pill-nutrition-tint",
    bar: "bg-pill-nutrition-accent",
  },
  hydration: {
    text: "text-pill-hydration-accent",
    tint: "bg-pill-hydration-tint",
    bar: "bg-pill-hydration-accent",
  },
  exercise: {
    text: "text-pill-exercise-accent",
    tint: "bg-pill-exercise-tint",
    bar: "bg-pill-exercise-accent",
  },
  sleep: {
    text: "text-pill-sleep-accent",
    tint: "bg-pill-sleep-tint",
    bar: "bg-pill-sleep-accent",
  },
  mental: {
    text: "text-pill-mental-accent",
    tint: "bg-pill-mental-tint",
    bar: "bg-pill-mental-accent",
  },
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
  
  // Translate tier label based on tier.label value
  const getTierLabel = () => {
    const labelKey = tier.label.toLowerCase().replace(' ', '');
    return translate(`vitanaIndex.${labelKey}`, tier.label);
  };
  
  // Build pillar config with translated labels
  const PILLAR_CONFIG = [
    { key: 'nutrition', label: translate('health.pillars.nutrition'), emoji: '🥗' },
    { key: 'exercise', label: translate('health.pillars.exercise'), emoji: '🏃' },
    { key: 'sleep', label: translate('health.pillars.sleep'), emoji: '😴' },
    { key: 'hydration', label: translate('health.pillars.hydration'), emoji: '💧' },
    { key: 'mental', label: translate('health.pillars.mental'), emoji: '🧠' },
  ] as const;
  
  // Find the weakest pillar
  const pillarEntries = Object.entries(pillars).filter(([_, v]) => v !== undefined) as [string, number][];
  const weakestPillar = pillarEntries.reduce((min, curr) => 
    curr[1] < min[1] ? curr : min
  , pillarEntries[0]);

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

        {/* Vitana Index - Dominant Visual */}
        <div className="relative flex flex-col items-center mb-3">
          {/* Soft pastel halo behind the score, mirroring the Index drawer's circle */}
          <div
            aria-hidden
            className="absolute -top-2 w-32 h-32 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 blur-xl pointer-events-none"
          />

          {/* Score */}
          <span className="relative text-5xl font-extrabold tracking-tight text-green-600">
            {vitanaIndex}
          </span>

          {/* Status Text */}
          <div className="flex items-center gap-2 mt-2">
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

        {/* Divider */}
        <div className="h-px bg-border/60 my-3" />

        {/* Pillar Micro-bars — each in its own pillar tint */}
        <div className="space-y-2">
          {PILLAR_CONFIG.map(({ key, label, emoji }) => {
            const value = pillars[key as keyof PillarData];
            if (value === undefined) return null;

            const isWeakest = key === weakestPillar[0];
            const palette = PILLAR_CLASSES[key];

            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm w-5">{emoji}</span>
                <span
                  className={`text-sm w-20 ${
                    isWeakest ? 'text-amber-600 font-medium' : palette.text
                  }`}
                >
                  {label}
                </span>
                <div className={`flex-1 h-2 rounded-full overflow-hidden ${palette.tint}`}>
                  <div
                    className={`h-full rounded-full transition-all ${
                      isWeakest
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                        : palette.bar
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span
                  className={`text-sm w-10 text-right ${
                    isWeakest ? 'text-amber-600 font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {value}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
