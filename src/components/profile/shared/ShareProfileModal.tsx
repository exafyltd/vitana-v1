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
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Share Profile</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Mini ID Card Preview */}
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-white/90 via-white/60 to-white/30 dark:from-gray-900/90 dark:via-gray-900/60 dark:to-gray-900/30 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 shadow-lg">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white/80 dark:border-gray-800/80">
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
            className="w-full justify-start gap-3 h-12"
            variant="default"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            <span className="font-medium">{copied ? "Link Copied!" : "Copy Profile Link"}</span>
          </Button>

          {/* QR Code Section */}
          {!showQR ? (
            <Button
              onClick={() => setShowQR(true)}
              variant="outline"
              className="w-full justify-start gap-3 h-12"
            >
              <QrCode className="h-5 w-5" />
              <span className="font-medium">Show QR Code</span>
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center p-6 bg-white dark:bg-gray-900 rounded-xl border">
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
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                Download QR Code
              </Button>
            </div>
          )}

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Share to social</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={onShareToLinkedIn}
                variant="outline"
                className="gap-2 h-10"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                onClick={onShareToX}
                variant="outline"
                className="gap-2 h-10"
              >
                <Twitter className="h-4 w-4" />
                X
              </Button>
              <Button
                onClick={onShareToFacebook}
                variant="outline"
                className="gap-2 h-10"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
            </div>
          </div>

          {/* View Public Profile */}
          <Button
            onClick={onViewPublicProfile}
            variant="secondary"
            className="w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Public Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
