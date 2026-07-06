/**
 * VitanaRecommendationHeader — the standard identity strip for every
 * AI-generated / proactive / autopilot card in the app.
 *
 * Renders the clean ORB avatar next to "Vitana" and identifies the destination
 * feature with the same icon users see in navigation.
 */

import { Activity, Sparkles, Users, Zap, type LucideIcon } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';
import { cn } from '@/lib/utils';

export type VitanaRecommendationLabel = 'vitana' | 'empfiehlt' | 'pick' | 'fuer_dich';
export type VitanaFeature = 'vitana-index' | 'guided-journey' | 'find-a-match';

const LABEL_KEY: Record<VitanaRecommendationLabel, string> = {
  vitana: 'screens.vitanaIdentity.vitana',
  empfiehlt: 'screens.vitanaIdentity.vitanaEmpfiehlt',
  pick: 'screens.vitanaIdentity.vitanaPick',
  fuer_dich: 'screens.vitanaIdentity.fuerDich',
};

const FEATURE_CONFIG: Record<VitanaFeature, { icon: LucideIcon; labelKey: string }> = {
  'vitana-index': {
    icon: Activity,
    labelKey: 'screens.vitanaIdentity.vitanaIndex',
  },
  'guided-journey': {
    icon: Zap,
    labelKey: 'screens.vitanaIdentity.guidedJourney',
  },
  'find-a-match': {
    icon: Users,
    labelKey: 'screens.vitanaIdentity.findAMatch',
  },
};

/** Standard diameter (px) for the ORB avatar — MUST stay identical across every card. */
export const VITANA_ORB_SIZE = 24;

export interface VitanaRecommendationHeaderProps {
  /** Destination feature represented by this Vitana-authored card. */
  feature?: VitanaFeature;
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
  feature,
  label = 'vitana',
  showForYouBadge = false,
  trailing,
  className,
}: VitanaRecommendationHeaderProps) {
  const featureConfig = feature ? FEATURE_CONFIG[feature] : null;
  const FeatureIcon = featureConfig?.icon;

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
          {t(feature ? LABEL_KEY.vitana : LABEL_KEY[label])}
        </span>
        {!feature && (
          <Sparkles className={cn('w-3.5 h-3.5 flex-shrink-0', VITANA_BRAND_TEXT)} aria-hidden="true" />
        )}
      </div>
      {featureConfig && FeatureIcon ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 flex-shrink-0 whitespace-nowrap">
          <FeatureIcon className="h-3 w-3" aria-hidden="true" />
          {t(featureConfig.labelKey)}
        </span>
      ) : trailing ?? (showForYouBadge && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex-shrink-0">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          {t('screens.vitanaIdentity.fuerDich')}
        </span>
      ))}
    </div>
  );
}
