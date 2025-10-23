import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";

interface ShareOptions {
  handle: string;
  name: string;
  profileId: string;
  isPublic: boolean;
}

export const useProfileShare = ({ handle, name, profileId, isPublic }: ShareOptions) => {
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Generate canonical profile URL with UTM parameters
  const getShareUrl = useCallback(() => {
    const baseUrl = window.location.origin;
    const profilePath = `/u/${handle}`;
    const utmParams = new URLSearchParams({
      utm_source: 'profile',
      utm_medium: 'share_button',
      utm_campaign: 'user_profile'
    });
    return `${baseUrl}${profilePath}?${utmParams.toString()}`;
  }, [handle]);

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
      // User cancelled or error occurred
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
    shareToWhatsApp,
    shareViaEmail,
    shareNative,
    canUseNativeShare: canUseNativeShare(),
    isPublic,
    getShareUrl
  };
};
