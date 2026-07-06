/**
 * Vitana Index card — replaces the old generic "Welcome back" banner slot
 * on the News screen. Shows the user's live Vitana Index score, tier, and
 * weakest pillar, and opens the existing VitanaIndexSheet overlay (the same
 * destination as the VitanaIndexChip elsewhere in the app) — no new routing.
 */

import { useVitanaIndex, weakestPillar, pillarLabel } from '@/hooks/useVitanaIndex';
import { getVitanaIndexTier } from '@/lib/vitanaIndex';
import { VITANA_INDEX_OPEN_EVENT } from '@/components/health/VitanaIndexSheet';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationHeader } from '@/components/vitana/VitanaRecommendationHeader';
import { ArrowRight } from 'lucide-react';

export function VitanaIndexCard() {
  const { index, isLoading } = useVitanaIndex();

  if (isLoading || !index) return null;

  const tier = getVitanaIndexTier(index.total);
  const weakest = weakestPillar(index.pillars);

  const openIndex = () => window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT));

  return (
    <div
      className="relative mb-3 w-full rounded-xl border border-primary/15 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 p-3 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <VitanaRecommendationHeader label="vitana" showForYouBadge className="mb-2" />

      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {t('screens.home.vitanaIndexEyebrow')}
      </span>
      <p className="text-base font-bold text-foreground">
        {t('screens.home.vitanaIndexScoreLine', { score: index.total, tier: t(tier.labelKey) })}
      </p>
      <p className="text-sm text-muted-foreground mt-0.5">
        {t('screens.home.vitanaIndexWeakestPillar', { pillar: pillarLabel(weakest) })}
      </p>

      <button
        onClick={openIndex}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        {t('screens.home.vitanaIndexViewIndex')}
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
