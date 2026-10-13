/**
 * Vitana Index card — replaces the old generic "Welcome back" banner slot
 * on the News screen. Shows the user's live Vitana Index score and weekly
 * trend, and opens the existing VitanaIndexSheet overlay (the same
 * destination as the VitanaIndexChip elsewhere in the app) — no new routing.
 *
 * The widget (score circle + 3-bar trend chart) is a destination preview,
 * not a chart: only the score is live data. The 3 bars are a fixed
 * ascending/descending/flat shape picked by `index.trend` — a legible echo
 * of the real Index screen's dial, not a duplicate of its chart.
 */

import { useState } from 'react';
import { HeartPulse, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useVitanaIndex } from '@/hooks/useVitanaIndex';
import { VITANA_INDEX_OPEN_EVENT } from '@/components/health/VitanaIndexSheet';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationCard } from '@/components/vitana/VitanaRecommendationCard';
import { VitanaCardActionButton } from '@/components/vitana/VitanaCardActionButton';
import { ACCENT_CLASSES, CARD_STYLE } from '@/components/vitana/vitana-card-catalog';
import { cn } from '@/lib/utils';

/** Fixed, decorative bar heights (%) per trend — never derived from real per-bar data. */
const TREND_BARS: Record<'up' | 'down' | 'stable', number[]> = {
  up: [35, 65, 100],
  down: [100, 65, 35],
  stable: [70, 70, 70],
};

const TREND_STYLE = {
  up: {
    icon: TrendingUp,
    textClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-400',
    headlineKey: 'screens.home.vitanaIndexUpHeadline',
    subtextKey: 'screens.home.vitanaIndexUpSubtext',
  },
  down: {
    icon: TrendingDown,
    textClass: 'text-amber-600 dark:text-amber-400',
    barClass: 'bg-amber-400',
    headlineKey: 'screens.home.vitanaIndexDownHeadline',
    subtextKey: 'screens.home.vitanaIndexDownSubtext',
  },
  stable: {
    icon: Minus,
    textClass: 'text-foreground',
    barClass: 'bg-slate-300 dark:bg-slate-600',
    headlineKey: 'screens.home.vitanaIndexStableHeadline',
    subtextKey: 'screens.home.vitanaIndexStableSubtext',
  },
} as const;

/** Weekly change as a share of the 0–999 scale — real, derived from the trailing history. */
function weeklyChangePct(history: Array<{ score: number }>): number {
  if (history.length < 2) return 0;
  const first = history[0].score;
  const last = history[history.length - 1].score;
  return Math.round(((last - first) / 999) * 100);
}

const STYLE = CARD_STYLE.F2; // VTID-05086: Unified Card System accent + button shape

export interface VitanaIndexCardProps {
  /**
   * VTID-05086: undefined = hide for this view (Home, unchanged); a function
   * is called on X (the strip's 7-day hide); null = no X (a card in a chat).
   */
  onDismiss?: (() => void) | null;
}

export function VitanaIndexCard({ onDismiss }: VitanaIndexCardProps = {}) {
  const { index, isLoading } = useVitanaIndex();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !index || dismissed) return null;

  const style = TREND_STYLE[index.trend];
  const TrendIcon = style.icon;
  const pct = Math.abs(weeklyChangePct(index.history));
  const bars = TREND_BARS[index.trend];

  const openIndex = () => window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT));

  return (
    <VitanaRecommendationCard
      feature="vitana-index"
      eyebrow={t('screens.home.vitanaIndexEyebrow')}
      onOpen={openIndex}
      onDismiss={
        onDismiss === null
          ? undefined
          : () => {
              onDismiss?.();
              setDismissed(true);
            }
      }
      dismissLabel={t('screens.vitanaIdentity.dismissCard')}
      accentClassName={ACCENT_CLASSES[STYLE.accent].border}
      widget={
        <div className="flex items-end gap-1">
          <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-sky-300 shadow-sm">
            <span className="text-xs font-bold leading-none text-emerald-900">{index.total}</span>
          </div>
          <div className="flex items-end gap-0.5 h-9">
            {bars.map((height, i) => (
              <div
                key={i}
                className={cn('w-1.5 rounded-t-sm', style.barClass)}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      }
    >
      <p className={cn('flex items-center gap-1 text-sm font-bold leading-tight line-clamp-2', style.textClass)}>
        <TrendIcon className="w-3.5 h-3.5 shrink-0" />
        {t(style.headlineKey, { pct })}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t(style.subtextKey)}</p>
      <VitanaCardActionButton
        className="mt-1"
        shape={STYLE.shape}
        accent={STYLE.accent}
        icon={HeartPulse}
        label={t('screens.vitanaIdentity.viewIndex')}
        onClick={openIndex}
      />
    </VitanaRecommendationCard>
  );
}
