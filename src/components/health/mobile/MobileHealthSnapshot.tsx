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
    <div className="mx-4 mt-1">
      <div 
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, hsl(216, 53%, 8%) 0%, hsl(222, 47%, 11%) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-lg text-white/70">🧬 {translate('health.healthSnapshot')}</span>
        </div>

        {/* Vitana Index - Dominant Visual */}
        <div className="relative flex flex-col items-center mb-6">
          {/* Ambient glow */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
              filter: 'blur(30px)',
              transform: 'scale(1.5)'
            }}
          />
          
          {/* Score */}
          <span 
            className="relative text-6xl font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, hsl(199, 60%, 58%) 0%, hsl(239, 50%, 72%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 25px rgba(14, 165, 233, 0.3))'
            }}
          >
            {vitanaIndex}
          </span>

          {/* Status Text */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-white/60 text-sm">
              {translate('health.topPercentile').replace('{percent}', vitanaPercentile.toString())}
            </span>
            <span className="text-white/30">·</span>
            <div className="flex items-center gap-1">
              <TrendIcon className={`w-4 h-4 ${
                trend === 'up' ? 'text-emerald-400' : 
                trend === 'down' ? 'text-red-400' : 
                'text-white/50'
              }`} />
              <span className={`text-sm ${
                trend === 'up' ? 'text-emerald-400' : 
                trend === 'down' ? 'text-red-400' : 
                'text-white/50'
              }`}>
                {trendLabel}
              </span>
            </div>
          </div>

          {/* Tier Badge */}
          <div 
            className="mt-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${tier.color}20`,
              color: tier.color
            }}
          >
            {getTierLabel()}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 my-4" />

        {/* Pillar Micro-bars */}
        <div className="space-y-3">
          {PILLAR_CONFIG.map(({ key, label, emoji }) => {
            const value = pillars[key as keyof PillarData];
            if (value === undefined) return null;
            
            const isWeakest = key === weakestPillar[0];
            
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm w-5">{emoji}</span>
                <span className={`text-sm w-20 ${isWeakest ? 'text-amber-400' : 'text-white/70'}`}>
                  {label}
                </span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isWeakest 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400' 
                        : 'bg-gradient-to-r from-sky-500 to-indigo-400'
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className={`text-sm w-10 text-right ${isWeakest ? 'text-amber-400 font-medium' : 'text-white/50'}`}>
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
