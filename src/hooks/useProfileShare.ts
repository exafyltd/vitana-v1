import { useState, useCallback } from "react";
import { analytics } from "@/lib/analytics";
import { notify, notifyError } from '@/lib/i18n-toast';

interface ShareOptions {
  handle: string;
  name: string;
  profileId: string;
  isPublic: boolean;
  avatarUrl?: string | null;
}

// Stable-per-input short hash. Used only as a cache-buster for third-party
// link-preview caches (WhatsApp keeps previews for ~7d per URL), NOT for
// anything security-sensitive. Same input → same hash, so re-shares of an
// unchanged avatar still share a stable URL and reuse WhatsApp's cache.
const hashString = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
};

// Baked into the `?v=` hash so we can invalidate ALL cached previews at once
// when the og-proxy worker's rendering changes. v2: multi-MB avatars used to
// be emitted as og:image verbatim; WhatsApp silently drops images over
// ~600 KB, so those share URLs have an image-less preview cached against
// them. Bumping the salt gives every profile a new URL key, forcing a fresh
// scrape against the fixed worker (which now serves a resized 512×512
// rendition).
const SHARE_URL_SALT = 'v2';

export const useProfileShare = ({ handle, name, profileId, isPublic, avatarUrl }: ShareOptions) => {
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Canonical profile URL on the apex (vitanaland.com) so iOS Universal
  // Links + Android App Links fire on the recipient's tap and hand off to
  // the Maxina app instead of opening WhatsApp/Telegram's in-app browser.
  // Crawlers still get rich previews via the `vitanaland-og-proxy`
  // worker, which is bound to `vitanaland.com/profiles/*` and proxies the
  // OG render through the gateway.
  //
  // We ALWAYS append `?v=<hash>` — even when avatarUrl is null. WhatsApp/
  // Facebook/Telegram cache previews per-URL for ~7d, and a profile that
  // had no avatar at first-share would otherwise be permanently stuck on
  // whatever the worker rendered that first time (often "no image" while
  // the default-images bucket was 403'ing). Hashing `noavatar:<id>` gives
  // those URLs a distinct, stable key that flips the moment an avatar is
  // added, forcing a fresh scrape.
  //
  const getShareUrl = useCallback(() => {
    const base = `https://vitanaland.com/profiles/${encodeURIComponent(profileId)}`;
    const versionInput = avatarUrl && avatarUrl.length > 0
      ? avatarUrl
      : `noavatar:${profileId}`;
    return `${base}?v=${hashString(`${SHARE_URL_SALT}:${versionInput}`)}`;
  }, [profileId, avatarUrl]);

  // Check if Web Share API is available
  const canUseNativeShare = useCallback(() => {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }, []);

  // Open share sheet and track
  const openShare = useCallback(() => {
    if (!isPublic) {
      notifyError('toasts.hooks.cannotSharePrivateProfile', 'toasts.hooks.profileMustPublicShare');
      return;
    }

    setIsShareOpen(true);
    analytics.trackShare('share_opened', 'sheet', profileId, handle);
  }, [isPublic, profileId, handle]);

  // Copy link to clipboard
  const copyLink = useCallback(async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      notify('toasts.hooks.profileLinkCopied', 'toasts.hooks.shareLinkHasCopiedClipboard');
      analytics.trackShare('share_completed', 'copy_link', profileId, handle);
      setIsShareOpen(false);
    } catch (error) {
      notifyError('toasts.hooks.failedCopy', 'toasts.hooks.pleaseTryAgain');
    }
  }, [getShareUrl, profileId, handle]);

  // Share to X (Twitter)
  const shareToX = useCallback(() => {
    const url = getShareUrl();
    const text = `Check out ${name}'s profile on Vitana`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, '_blank', 'noopener,noreferrer');
    analytics.trackShare('share_completed', 'x', profileId, handle);
    setIsShareOpen(false);
  }, [getShareUrl, name, profileId, handle]);

  // Share to LinkedIn
  const shareToLinkedIn = useCallback(() => {
    const url = getShareUrl();
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    analytics.trackShare('share_completed', 'linkedin', profileId, handle);
    setIsShareOpen(false);
  }, [getShareUrl, profileId, handle]);

  // Share to Facebook
  const shareToFacebook = useCallback(() => {
    const url = getShareUrl();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
    analytics.trackShare('share_completed', 'facebook', profileId, handle);
    setIsShareOpen(false);
  }, [getShareUrl, profileId, handle]);

  // Share via WhatsApp
  const shareToWhatsApp = useCallback(() => {
    const url = getShareUrl();
    const text = `Check out ${name}'s profile on Vitana`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    analytics.trackShare('share_completed', 'whatsapp', profileId, handle);
    setIsShareOpen(false);
  }, [getShareUrl, name, profileId, handle]);

  // Share via Email
  const shareViaEmail = useCallback(() => {
    const url = getShareUrl();
    const subject = `Check out ${name}'s profile`;
    const body = `I thought you might be interested in ${name}'s profile on Vitana:\n\n${url}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    analytics.trackShare('share_completed', 'email', profileId, handle);
    setIsShareOpen(false);
  }, [getShareUrl, name, profileId, handle]);

  // Share to Instagram (copy link + guidance toast)
  const shareToInstagram = useCallback(async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      notify('toasts.hooks.linkCopied', 'toasts.hooks.pasteItYourInstagramStoryPost');
      analytics.trackShare('share_completed', 'instagram', profileId, handle);
      setIsShareOpen(false);
    } catch {
      notifyError('toasts.hooks.failedCopy', 'toasts.hooks.pleaseTryAgain');
    }
  }, [getShareUrl, profileId, handle]);

  // Share to TikTok (copy link + guidance toast)
  const shareToTikTok = useCallback(async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      notify('toasts.hooks.linkCopied', 'toasts.hooks.pasteItYourTiktokBioVideo');
      analytics.trackShare('share_completed', 'tiktok', profileId, handle);
      setIsShareOpen(false);
    } catch {
      notifyError('toasts.hooks.failedCopy', 'toasts.hooks.pleaseTryAgain');
    }
  }, [getShareUrl, profileId, handle]);

  // Share to YouTube (copy link + guidance toast)
  const shareToYouTube = useCallback(async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      notify('toasts.hooks.linkCopied', 'toasts.hooks.pasteItYourYoutubeVideoDescription');
      analytics.trackShare('share_completed', 'youtube', profileId, handle);
      setIsShareOpen(false);
    } catch {
      notifyError('toasts.hooks.failedCopy', 'toasts.hooks.pleaseTryAgain');
    }
  }, [getShareUrl, profileId, handle]);

  // Native Web Share API
  const shareNative = useCallback(async () => {
    if (!canUseNativeShare()) return;

    try {
      const url = getShareUrl();
      await navigator.share({
        title: `${name}'s Profile`,
        text: `Check out ${name}'s profile on Vitana`,
        url: url
      });
      analytics.trackShare('share_completed', 'web_share', profileId, handle);
      setIsShareOpen(false);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        notifyError('toasts.hooks.shareFailed', 'toasts.hooks.pleaseTryAnotherSharingMethod');
      }
    }
  }, [canUseNativeShare, getShareUrl, name, profileId, handle]);

  return {
    isShareOpen,
    setIsShareOpen,
    openShare,
    copyLink,
    shareToX,
    shareToLinkedIn,
    shareToFacebook,
    shareToWhatsApp,
    shareViaEmail,
    shareToInstagram,
    shareToTikTok,
    shareToYouTube,
    shareNative,
    canUseNativeShare: canUseNativeShare(),
    isPublic,
    getShareUrl
  };
};
