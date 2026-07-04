/**
 * Companion Phase H.1 — Welcome-Back Banner (VTID-01948)
 *
 * Shown at the top of Home when the user returns after a meaningful absence.
 * Backend (GET /api/v1/presence/welcome) decides eligibility, copy, variant.
 * Frontend renders + wires up CTA / dismiss.
 */

import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { useWelcomeBanner, WelcomeVariant } from '@/hooks/useProactivePresence';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationHeader } from '@/components/vitana/VitanaRecommendationHeader';

const VARIANT_BG: Record<WelcomeVariant, string> = {
  urgent: 'from-red-500/10 via-orange-500/10 to-red-500/10',
  warm:   'from-pink-500/10 via-rose-500/10 to-pink-500/10',
  engage: 'from-violet-500/10 via-purple-500/10 to-violet-500/10',
  inform: 'from-yellow-500/10 via-amber-500/10 to-yellow-500/10',
};

export function WelcomeBackBanner() {
  const navigate = useNavigate();
  const { banner, acknowledge, dismiss } = useWelcomeBanner();

  if (!banner) return null;

  const bg = VARIANT_BG[banner.variant] || VARIANT_BG.inform;

  const handleCta = () => {
    acknowledge();
    if (banner.cta_url) navigate(banner.cta_url);
  };

  return (
    <div
      className={`relative mb-3 w-full rounded-xl border border-primary/15 bg-gradient-to-r ${bg} p-3 animate-fade-in`}
      role="status"
      aria-live="polite"
    >
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
        aria-label={t('screens.home.dismissWelcomeBanner')}
      >
        <X className="w-4 h-4" />
      </button>

      <VitanaRecommendationHeader label="vitana" showForYouBadge className="pr-6 mb-2" />

      <p className="text-sm text-foreground leading-relaxed">{banner.copy}</p>
      {banner.cta_url && (
        <button
          onClick={handleCta}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {t('screens.home.showMe')}
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
