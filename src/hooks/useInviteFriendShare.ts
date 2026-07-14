/**
 * "Invite a friend" share flow — shares the hosted MAXINA download-flyer
 * page (/download) through the best channel available:
 *
 *   1. Web Share API → navigator.share (mobile browsers, Safari/Edge desktop)
 *   2. Appilix shell bridge → fire-and-forget (see below)
 *   3. Clipboard → copy link + toast — ALWAYS reached when (1) didn't handle
 *      the tap, so no environment can turn the tap into a silent no-op
 *
 * The Appilix bridge gives no acknowledgment: post() only tells us the
 * message was delivered to the shell, not that the shell supports the
 * `share` action (in production it ignored it, making the button appear
 * dead). So the bridge is never trusted as the terminal step — the
 * clipboard+toast always follows it as guaranteed visible feedback.
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

    if (isAvailable) {
      const result = await share({ title, text, url: flyerUrl });
      // "cancelled" is a deliberate user action — no fallback, no toast.
      if (result !== 'failed') return;
    }

    if (isAppilix()) {
      // The shell's share action takes plain text — append the URL so it
      // stays tappable in messengers. Deliberately not returned on: the
      // shell may not support the action and never acknowledges either way.
      appilixShare(`${text}\n${flyerUrl}`, title);
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
