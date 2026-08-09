/**
 * Invite-a-friend card — News-feed promo card that opens the native share
 * dialog with the hosted MAXINA download-flyer link (/download). Same
 * VitanaRecommendationCard family as the Vitana Index / Longevity Journey
 * cards so it reads as one more Vitana recommendation, not an ad banner.
 */

import { useState } from 'react';
import { ArrowRight, Share2 } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { useInviteFriendShare } from '@/hooks/useInviteFriendShare';
import { VitanaRecommendationCard } from '@/components/vitana/VitanaRecommendationCard';

export function InviteFriendCard() {
  const { shareInvite } = useInviteFriendShare();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <VitanaRecommendationCard
      feature="invite-friend"
      eyebrow={t('screens.downloadFlyer.inviteCardEyebrow')}
      onOpen={() => void shareInvite()}
      onDismiss={() => setDismissed(true)}
      dismissLabel={t('screens.vitanaIdentity.dismissCard')}
      widget={
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-blue-500 shadow-sm">
          <Share2 className="w-4 h-4 text-white" />
        </div>
      }
    >
      <p className="text-sm font-bold text-blue-700 dark:text-blue-400 leading-tight line-clamp-2">
        {t('screens.downloadFlyer.inviteCardTitle')}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
        {t('screens.downloadFlyer.inviteCardBody')}
      </p>
      <span className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors">
        <span className="truncate">{t('screens.downloadFlyer.inviteCardCta')}</span>
        <ArrowRight className="w-3 h-3 shrink-0" />
      </span>
    </VitanaRecommendationCard>
  );
}
