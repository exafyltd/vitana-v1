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

/** Standard diameter (px) for the ORB avatar — MUST stay identical across every card. */
export const VITANA_ORB_SIZE = 24;

export interface VitanaRecommendationHeaderProps {
  /** Which label to show next to the ORB avatar. Defaults to plain "Vitana". */
  label?: VitanaRecommendationLabel;
  /** Show the "Für dich" pill badge on the right side of the header. */
  showForYouBadge?: boolean;
  /**
   * Arbitrary content for the right side of the header (e.g. a "why you're
   * seeing this" pill). Takes precedence over showForYouBadge if both are set.
   */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * The "Vitana" wordmark always uses this brand blue — NOT `text-primary`
 * (which resolves to near-black in this app's theme). A happy, recognizable
 * color is the whole point of the identity header.
 */
const VITANA_BRAND_TEXT = 'text-blue-600 dark:text-blue-400';

export function VitanaRecommendationHeader({
  label = 'vitana',
  showForYouBadge = false,
  trailing,
  className,
}: VitanaRecommendationHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2 flex-wrap', className)}>
      {/*
        flex-shrink-0 here (not min-w-0) is deliberate: the brand label must
        never truncate. Callers that pass `trailing` are responsible for
        giving it its own min-w-0/truncate/max-w so IT yields space instead.
      */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <img
          src={VITANA_BOT_AVATAR_URL}
          alt={t('screens.vitanaIdentity.orbAlt')}
          width={VITANA_ORB_SIZE}
          height={VITANA_ORB_SIZE}
          className="flex-shrink-0 rounded-full"
        />
        <span className={cn('text-sm font-semibold truncate', VITANA_BRAND_TEXT)}>
          {t(LABEL_KEY[label])}
        </span>
        <Sparkles className={cn('w-3.5 h-3.5 flex-shrink-0', VITANA_BRAND_TEXT)} aria-hidden="true" />
      </div>
      {trailing ?? (showForYouBadge && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex-shrink-0">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          {t('screens.vitanaIdentity.fuerDich')}
        </span>
      ))}
    </div>
  );
}
