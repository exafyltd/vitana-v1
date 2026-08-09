/**
 * "Invite a friend" share flow — shares the hosted MAXINA download-flyer
 * page (/download) exactly like event/profile sharing does:
 *
 *   1. Web Share API → navigator.share — the native share dialog. Works in
 *      the Appilix WebView too (event sharing proves it), so NO Appilix
 *      bridge branch here: the shell's `share` action is unacknowledged and
 *      ignored in production, and gating on it made the button a dead tap.
 *      Like events, the payload is { title, url } WITHOUT `text` — iOS/
 *      WebKit renders text+URL as a cluttered second message bubble (see
 *      handleShareEvent in pages/community/EventsAndMeetups.tsx); the rich
 *      preview comes from /download's Open Graph tags instead.
 *   2. Clipboard → copy link + toast — only where no share dialog exists
 *      (e.g. desktop Firefox), so a tap always has a visible outcome.
 *
 * The flyer URL carries the SENDER's app language (?lang=de) so a German
 * user's invite always opens a German flyer, independent of the recipient's
 * device settings. Used by both the home-feed InviteFriendCard and the
 * home-header invite icon so the two entry points can't drift apart.
 */

import { useCallback } from 'react';
import { useNativeShare } from '@/hooks/useNativeShare';
import { DOWNLOAD_FLYER_URL } from '@/lib/store-links';
import { getI18nLocale, t, notifySuccess, notifyError } from '@/lib/i18n-toast';

export function useInviteFriendShare() {
  const { share } = useNativeShare({
    contentId: 'download-flyer',
    contentType: 'app_invite',
  });

  const shareInvite = useCallback(async () => {
    const lang = getI18nLocale().split('-')[0] || 'de';
    const flyerUrl = `${DOWNLOAD_FLYER_URL}?lang=${lang}`;
    const title = t('screens.downloadFlyer.inviteShareTitle');

    // Always attempt the share — share() checks navigator.share at call
    // time, so a late-injected WebView share API is still picked up.
    const result = await share({ title, url: flyerUrl });
    // "cancelled" is a deliberate user action — no fallback, no toast.
    if (result !== 'failed') return;

    try {
      await navigator.clipboard.writeText(flyerUrl);
      notifySuccess('toasts.common.inviteLinkCopied');
    } catch {
      notifyError('toasts.common.couldnTCopyPleaseCopyLink');
    }
  }, [share]);

  return { shareInvite };
}
