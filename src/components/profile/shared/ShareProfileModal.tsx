import { useState } from "react";
import { Copy, Check, QrCode, Download, ExternalLink, Twitter, Linkedin, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserProfile } from "@/types/profile";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/hooks/use-toast";

interface ShareProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  onCopyLink: () => void;
  onShareToX: () => void;
  onShareToLinkedIn: () => void;
  onShareToFacebook: () => void;
  onViewPublicProfile: () => void;
}

export function ShareProfileModal({
  isOpen,
  onOpenChange,
  profile,
  onCopyLink,
  onShareToX,
  onShareToLinkedIn,
  onShareToFacebook,
  onViewPublicProfile,
}: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const profileUrl = `${window.location.origin}/u/${profile.handle}`;

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
          toast({
            title: "QR Code downloaded",
            description: "QR code saved successfully"
          });
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 shadow-[0_20px_60px_rgba(0,0,0,0.2)] rounded-3xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader className="p-6 pb-4 border-b border-white/20 dark:border-gray-800/20">
          <DialogTitle className="text-xl font-bold text-foreground">Share Profile</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Mini ID Card Preview */}
          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-white/80 via-white/50 to-white/20 dark:from-gray-900/80 dark:via-gray-900/50 dark:to-gray-900/20 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/5 via-transparent to-[hsl(var(--pill-nutrition-accent))]/5 rounded-2xl pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white/80 dark:border-gray-800/80 shadow-lg">
                <AvatarImage src={profile.avatarUrl} alt={profile.name} />
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
                <span className="font-semibold">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                <span className="font-semibold">Copy Profile Link</span>
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
              <span className="font-medium">Show QR Code</span>
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
                <span className="font-medium">Download QR Code</span>
              </Button>
            </div>
          )}

          {/* Social Share Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">Share to social</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={onShareToLinkedIn}
                variant="outline"
                className="gap-2 h-11 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-white/40 dark:border-gray-700/40 hover:bg-[#0077B5]/10 hover:border-[#0077B5]/30 hover:text-[#0077B5] transition-all"
              >
                <Linkedin className="h-4 w-4" />
                <span className="font-medium">LinkedIn</span>
              </Button>
              <Button
                onClick={onShareToX}
                variant="outline"
                className="gap-2 h-11 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-white/40 dark:border-gray-700/40 hover:bg-foreground/10 hover:border-foreground/30 transition-all"
              >
                <Twitter className="h-4 w-4" />
                <span className="font-medium">X</span>
              </Button>
              <Button
                onClick={onShareToFacebook}
                variant="outline"
                className="gap-2 h-11 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-white/40 dark:border-gray-700/40 hover:bg-[#1877F2]/10 hover:border-[#1877F2]/30 hover:text-[#1877F2] transition-all"
              >
                <Facebook className="h-4 w-4" />
                <span className="font-medium">Facebook</span>
              </Button>
            </div>
          </div>

          {/* View Public Profile */}
          <Button
            onClick={onViewPublicProfile}
            variant="secondary"
            className="w-full gap-2 h-11 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="font-medium">View Public Profile</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
