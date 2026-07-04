/**
 * VitanaRecommendationHeader — the standard identity strip for every
 * AI-generated / proactive / autopilot card in the app.
 *
 * Renders the clean ORB avatar next to a "Vitana" label (with optional
 * "empfiehlt"/"Pick" variants), plus an optional "Für dich" pill so the
 * source is never ambiguous ("AI" must never be the headline identity —
 * see CLAUDE.md acceptance criteria for VTID recommendation-identity work).
 */

import { Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';
import { cn } from '@/lib/utils';

export type VitanaRecommendationLabel = 'vitana' | 'empfiehlt' | 'pick' | 'fuer_dich';

const LABEL_KEY: Record<VitanaRecommendationLabel, string> = {
  vitana: 'screens.vitanaIdentity.vitana',
  empfiehlt: 'screens.vitanaIdentity.vitanaEmpfiehlt',
  pick: 'screens.vitanaIdentity.vitanaPick',
  fuer_dich: 'screens.vitanaIdentity.fuerDich',
};

export interface VitanaRecommendationHeaderProps {
  /** Which label to show next to the ORB avatar. Defaults to plain "Vitana". */
  label?: VitanaRecommendationLabel;
  /** Show the "Für dich" pill badge on the right side of the header. */
  showForYouBadge?: boolean;
  /** Avatar diameter in px. Defaults to 24 to keep cards compact. */
  size?: number;
  className?: string;
}

export function VitanaRecommendationHeader({
  label = 'vitana',
  showForYouBadge = false,
  size = 24,
  className,
}: VitanaRecommendationHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="flex items-center gap-1.5 min-w-0">
        <img
          src={VITANA_BOT_AVATAR_URL}
          alt={t('screens.vitanaIdentity.orbAlt')}
          width={size}
          height={size}
          className="flex-shrink-0 rounded-full"
        />
        <span className="text-sm font-semibold text-primary truncate">
          {t(LABEL_KEY[label])}
        </span>
        <Sparkles className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" aria-hidden="true" />
      </div>
      {showForYouBadge && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary flex-shrink-0">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          {t('screens.vitanaIdentity.fuerDich')}
        </span>
      )}
    </div>
  );
}
