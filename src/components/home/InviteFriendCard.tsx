/**
 * Invite-a-friend card — News-feed promo card that opens the native share
 * dialog with the hosted MAXINA download-flyer link (/download). Same
 * VitanaRecommendationCard family as the Vitana Index / Longevity Journey
 * cards so it reads as one more Vitana recommendation, not an ad banner.
 */

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { useInviteFriendShare } from '@/hooks/useInviteFriendShare';
import { VitanaRecommendationCard } from '@/components/vitana/VitanaRecommendationCard';
import { VitanaCardActionButton } from '@/components/vitana/VitanaCardActionButton';
import { ACCENT_CLASSES, CARD_STYLE } from '@/components/vitana/vitana-card-catalog';

const STYLE = CARD_STYLE.F7; // VTID-05086: Unified Card System accent + button shape

export interface InviteFriendCardProps {
  /** VTID-05086: undefined = hide for this view; function = called on X; null = no X (chat). */
  onDismiss?: (() => void) | null;
}

export function InviteFriendCard({ onDismiss }: InviteFriendCardProps = {}) {
  const { shareInvite } = useInviteFriendShare();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <VitanaRecommendationCard
      feature="invite-friend"
      eyebrow={t('screens.downloadFlyer.inviteCardEyebrow')}
      onOpen={() => void shareInvite()}
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
          icon={Share2}
          label={t('screens.downloadFlyer.inviteCardCta')}
          onClick={() => void shareInvite()}
        />
      }
    >
      <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
        {t('screens.downloadFlyer.inviteCardTitle')}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
        {t('screens.downloadFlyer.inviteCardBody')}
      </p>
    </VitanaRecommendationCard>
  );
}
