/**
 * "Invite a friend" share flow — shares the hosted MAXINA download-flyer
 * page (/download) through the best channel available:
 *
 *   1. Appilix shell → native OS share sheet via the bridge
 *   2. Web Share API → navigator.share (mobile browsers, Safari/Edge desktop)
 *   3. Clipboard fallback → copy link + toast (e.g. desktop Firefox)
 *
 * The flyer URL carries the SENDER's app language (?lang=de) so a German
 * user's invite always opens a German flyer, independent of the recipient's
 * device settings. Used by both the home-feed InviteFriendCard and the
 * home-header invite icon so the two entry points can't drift apart.
 */

import { useCallback } from 'react';
import { isAppilix, share as appilixShare } from '@/lib/appilix';
import { useNativeShare } from '@/hooks/useNativeShare';
import { DOWNLOAD_FLYER_URL } from '@/lib/store-links';
import { getI18nLocale, t, notifySuccess, notifyError } from '@/lib/i18n-toast';

export function useInviteFriendShare() {
  const { isAvailable, share } = useNativeShare({
    contentId: 'download-flyer',
    contentType: 'app_invite',
  });

  const shareInvite = useCallback(async () => {
    const lang = getI18nLocale().split('-')[0] || 'de';
    const flyerUrl = `${DOWNLOAD_FLYER_URL}?lang=${lang}`;
    const title = t('screens.downloadFlyer.inviteShareTitle');
    const text = t('screens.downloadFlyer.inviteShareText');

    if (isAppilix()) {
      // The shell's share action takes plain text — append the URL so it
      // stays tappable in messengers.
      if (appilixShare(`${text}\n${flyerUrl}`, title)) return;
    }

    if (isAvailable) {
      const result = await share({ title, text, url: flyerUrl });
      // "cancelled" is a deliberate user action — no fallback, no toast.
      if (result !== 'failed') return;
    }

    try {
      await navigator.clipboard.writeText(flyerUrl);
      notifySuccess('toasts.common.inviteLinkCopied');
    } catch {
      notifyError('toasts.common.couldnTCopyPleaseCopyLink');
    }
  }, [isAvailable, share]);

  return { shareInvite };
}
