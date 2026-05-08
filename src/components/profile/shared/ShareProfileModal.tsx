import { useState } from "react";
import { Copy, Check, QrCode, Download, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { getDisplayAvatarUrl } from "@/lib/autoAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserProfile } from "@/types/profile";
import { QRCodeSVG } from "qrcode.react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { XIcon } from "@/components/icons/XIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { YouTubeIcon } from "@/components/icons/YouTubeIcon";
import { useTranslation } from "@/hooks/useTranslation";
import { notify } from '@/lib/i18n-toast';

export interface ConnectedPlatforms {
  linkedin?: boolean;
  instagram?: boolean;
  facebook?: boolean;
  x?: boolean;
  youtube?: boolean;
  tiktok?: boolean;
}

interface ShareProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  onCopyLink: () => void;
  onShareToX: () => void;
  onShareToLinkedIn: () => void;
  onShareToFacebook: () => void;
  onShareToInstagram?: () => void;
  onShareToTikTok?: () => void;
  onShareToYouTube?: () => void;
  onViewPublicProfile: () => void;
  connectedPlatforms?: ConnectedPlatforms;
}

interface PlatformDef {
  id: string;
  name: string;
  icon: React.ReactNode;
  handler: () => void;
}

export function ShareProfileModal({
  isOpen,
  onOpenChange,
  profile,
  onCopyLink,
  onShareToX,
  onShareToLinkedIn,
  onShareToFacebook,
  onShareToInstagram,
  onShareToTikTok,
  onShareToYouTube,
  onViewPublicProfile,
  connectedPlatforms = {},
}: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const profileUrl = `${window.location.origin}/u/${profile.handle || profile.user_id || profile.id}`;
  const { translate } = useTranslation();

  const handleCopyLink = async () => {
    await onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('profile-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${profile.handle}-qr.png`;
          a.click();
          URL.revokeObjectURL(url);
          notify('toasts.profile.qrCodeDownloaded2', 'toasts.profile.qrCodeSavedSuccessfully');
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Define all 6 platforms
  const allPlatforms: PlatformDef[] = [
    { id: 'linkedin', name: 'LinkedIn', icon: <LinkedInIcon className="h-5 w-5" connected={!!connectedPlatforms.linkedin} />, handler: onShareToLinkedIn },
    { id: 'x', name: 'X', icon: <XIcon className="h-5 w-5" />, handler: onShareToX },
    { id: 'facebook', name: 'Facebook', icon: <FacebookIcon className="h-5 w-5" connected={!!connectedPlatforms.facebook} />, handler: onShareToFacebook },
    { id: 'instagram', name: 'Instagram', icon: <InstagramIcon className="h-5 w-5" connected={!!connectedPlatforms.instagram} />, handler: onShareToInstagram || (() => {}) },
    { id: 'tiktok', name: 'TikTok', icon: <TikTokIcon className="h-5 w-5" connected={!!connectedPlatforms.tiktok} />, handler: onShareToTikTok || (() => {}) },
    { id: 'youtube', name: 'YouTube', icon: <YouTubeIcon className="h-5 w-5" connected={!!connectedPlatforms.youtube} />, handler: onShareToYouTube || (() => {}) },
  ];

  const connected = allPlatforms.filter(p => connectedPlatforms[p.id as keyof ConnectedPlatforms]);
  const unconnected = allPlatforms.filter(p => !connectedPlatforms[p.id as keyof ConnectedPlatforms]);
  const hasConnected = connected.length > 0;

  const renderPlatformButton = (platform: PlatformDef, isConnected: boolean) => (
    <Button
      key={platform.id}
      onClick={platform.handler}
      variant="outline"
      className={`gap-2 h-12 rounded-2xl backdrop-blur-sm transition-all flex flex-col items-center justify-center py-2 px-3 ${
        isConnected
          ? 'bg-[hsl(var(--sys-vitana-accent))]/5 border-[hsl(var(--sys-vitana-accent))]/30 hover:bg-[hsl(var(--sys-vitana-accent))]/10 relative'
          : 'bg-white/40 dark:bg-gray-800/40 border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60'
      }`}
    >
      {isConnected && (
        <CheckCircle2 className="absolute top-1 right-1 h-3.5 w-3.5 text-[hsl(var(--sys-vitana-accent))]" />
      )}
      {platform.icon}
      <span className="text-xs font-medium">{platform.name}</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 shadow-[0_20px_60px_rgba(0,0,0,0.2)] rounded-3xl animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader className="p-6 pb-4 border-b border-white/20 dark:border-gray-800/20">
          <DialogTitle className="text-xl font-bold text-foreground">{translate('share.shareProfile', 'Share Profile')}</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Mini ID Card Preview */}
          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-white/80 via-white/50 to-white/20 dark:from-gray-900/80 dark:via-gray-900/50 dark:to-gray-900/20 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/5 via-transparent to-[hsl(var(--pill-nutrition-accent))]/5 rounded-2xl pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white/80 dark:border-gray-800/80 shadow-lg">
                <AvatarImage src={getDisplayAvatarUrl(profile)} alt={profile.name} style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)} />
                <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] text-white">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground truncate">{profile.name}</h3>
                  {profile.vitanaIndex && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] shadow-lg flex items-center justify-center border-2 border-white/40">
                      <span className="text-sm font-bold text-white">{profile.vitanaIndex}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{profile.handle}</p>
              </div>
            </div>
          </div>

          {/* Copy Link */}
          <Button
            onClick={handleCopyLink}
            className="w-full justify-start gap-3 h-12 rounded-2xl bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] hover:from-[hsl(var(--sys-vitana-accent))]/90 hover:to-[hsl(var(--pill-nutrition-accent))]/90 shadow-[0_4px_16px_hsl(var(--sys-vitana-accent)/0.3)] hover:shadow-[0_6px_24px_hsl(var(--sys-vitana-accent)/0.4)] transition-all text-white border-0"
            variant="default"
          >
            {copied ? (
              <>
                <Check className="h-5 w-5 animate-in zoom-in-50 duration-200" />
                <span className="font-semibold">{translate('share.linkCopied', 'Link Copied!')}</span>
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                <span className="font-semibold">{translate('share.copyProfileLink', 'Copy Profile Link')}</span>
              </>
            )}
          </Button>

          {/* QR Code Section */}
          {!showQR ? (
            <Button
              onClick={() => setShowQR(true)}
              variant="outline"
              className="w-full justify-start gap-3 h-12 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all"
            >
              <QrCode className="h-5 w-5" />
              <span className="font-medium">{translate('share.showQRCode', 'Show QR Code')}</span>
            </Button>
          ) : (
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-center p-6 bg-white dark:bg-gray-900 rounded-2xl border border-white/40 dark:border-gray-800/40 shadow-lg">
                <QRCodeSVG
                  id="profile-qr-code"
                  value={profileUrl}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="w-full gap-2 h-11 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all"
              >
                <Download className="h-4 w-4" />
                <span className="font-medium">{translate('share.downloadQR', 'Download QR Code')}</span>
              </Button>
            </div>
          )}

          {/* Social Share Buttons */}
          <div className="space-y-3">
            {hasConnected ? (
              <>
                <p className="text-sm font-semibold text-muted-foreground">{translate('share.shareToSocial', 'Share to social')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {connected.map(p => renderPlatformButton(p, true))}
                </div>
                {unconnected.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground mt-3">{translate('share.alsoShareTo', 'Also share to')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {unconnected.map(p => renderPlatformButton(p, false))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-muted-foreground">{translate('share.shareToSocial', 'Share to social')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {allPlatforms.map(p => renderPlatformButton(p, false))}
                </div>
              </>
            )}
          </div>

          {/* View Public Profile */}
          <Button
            onClick={onViewPublicProfile}
            variant="secondary"
            className="w-full gap-2 h-11 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="font-medium">{translate('share.viewPublicProfile', 'View Public Profile')}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
