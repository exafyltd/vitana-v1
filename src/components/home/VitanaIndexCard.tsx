/**
 * Vitana Index card — replaces the old generic "Welcome back" banner slot
 * on the News screen. Shows the user's live Vitana Index score and weekly
 * trend, and opens the existing VitanaIndexSheet overlay (the same
 * destination as the VitanaIndexChip elsewhere in the app) — no new routing.
 *
 * VTID-05143: on the Unified Card System shell like every other card — the
 * action button sits in the widget slot. The live score that used to sit in
 * a score circle (with a decorative 3-bar trend shape) is now part of the
 * subtext; the trend direction stays as the headline's arrow.
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
import { fmtNumber } from '@/lib/locale-format';

const TREND_STYLE = {
  up: {
    icon: TrendingUp,
    textClass: 'text-emerald-600 dark:text-emerald-400',
    headlineKey: 'screens.home.vitanaIndexUpHeadline',
    subtextKey: 'screens.home.vitanaIndexUpSubtext',
  },
  down: {
    icon: TrendingDown,
    textClass: 'text-amber-600 dark:text-amber-400',
    headlineKey: 'screens.home.vitanaIndexDownHeadline',
    subtextKey: 'screens.home.vitanaIndexDownSubtext',
  },
  stable: {
    icon: Minus,
    textClass: 'text-foreground',
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
      widgetInteractive
      widget={
        <VitanaCardActionButton
          shape={STYLE.shape}
          accent={STYLE.accent}
          icon={HeartPulse}
          label={t('screens.vitanaIdentity.viewIndex')}
          onClick={openIndex}
        />
      }
    >
      {/* Inline arrow (not a flex row) so line-clamp keeps working on the headline. */}
      <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
        <TrendIcon className={cn('inline-block h-3.5 w-3.5 me-1 align-text-bottom', style.textClass)} aria-hidden="true" />
        {t(style.headlineKey, { pct })}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
        {t('screens.home.vitanaIndexScoreSubtext', { score: fmtNumber(index.total), message: t(style.subtextKey) })}
      </p>
    </VitanaRecommendationCard>
  );
}
