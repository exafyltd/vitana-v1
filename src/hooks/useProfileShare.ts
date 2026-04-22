import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";

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

export const useProfileShare = ({ handle, name, profileId, isPublic, avatarUrl }: ShareOptions) => {
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Canonical profile URL that hits the Cloudflare OG proxy for rich previews.
  // When we have an avatar_url we append ?v=<hash(avatar_url)> so that
  // WhatsApp/Facebook/Telegram invalidate their per-URL preview cache the
  // moment the avatar changes — without busting cache on unrelated re-shares.
  const getShareUrl = useCallback(() => {
    const base = `https://e.vitanaland.com/profiles/${encodeURIComponent(profileId)}`;
    if (avatarUrl) {
      return `${base}?v=${hashString(avatarUrl)}`;
    }
    return base;
  }, [profileId, avatarUrl]);

  // Check if Web Share API is available
  const canUseNativeShare = useCallback(() => {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }, []);

  // Open share sheet and track
  const openShare = useCallback(() => {
    if (!isPublic) {
      toast({
        title: "Cannot share private profile",
        description: "Profile must be public to share",
        variant: "destructive"
      });
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
      toast({
        title: "Profile link copied",
        description: "Share link has been copied to clipboard"
      });
      analytics.trackShare('share_completed', 'copy_link', profileId, handle);
      setIsShareOpen(false);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive"
      });
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
      toast({
        title: "Link copied!",
        description: "Paste it in your Instagram story or post"
      });
      analytics.trackShare('share_completed', 'instagram', profileId, handle);
      setIsShareOpen(false);
    } catch {
      toast({ title: "Failed to copy", description: "Please try again", variant: "destructive" });
    }
  }, [getShareUrl, profileId, handle]);

  // Share to TikTok (copy link + guidance toast)
  const shareToTikTok = useCallback(async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Paste it in your TikTok bio or video description"
      });
      analytics.trackShare('share_completed', 'tiktok', profileId, handle);
      setIsShareOpen(false);
    } catch {
      toast({ title: "Failed to copy", description: "Please try again", variant: "destructive" });
    }
  }, [getShareUrl, profileId, handle]);

  // Share to YouTube (copy link + guidance toast)
  const shareToYouTube = useCallback(async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Paste it in your YouTube video description or community post"
      });
      analytics.trackShare('share_completed', 'youtube', profileId, handle);
      setIsShareOpen(false);
    } catch {
      toast({ title: "Failed to copy", description: "Please try again", variant: "destructive" });
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
        toast({
          title: "Share failed",
          description: "Please try another sharing method",
          variant: "destructive"
        });
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
