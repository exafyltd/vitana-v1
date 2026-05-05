import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Copy, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "@/hooks/useTranslation";
import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { notify, notifyError } from '@/lib/i18n-toast';

interface MobileQRShareScreenProps {
  isOpen: boolean;
  onClose: () => void;
  profileUrl: string;
  profileName: string;
  profileHandle?: string;
  avatarUrl?: string | null;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
}

export function MobileQRShareScreen({
  isOpen,
  onClose,
  profileUrl,
  profileName,
  profileHandle,
  avatarOffsetX,
  avatarOffsetY,
  avatarUrl,
}: MobileQRShareScreenProps) {
  const { translate } = useTranslation();
  const [copied, setCopied] = useState(false);

  const initials = profileName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: translate('qrShare.linkCopied', 'Link copied!') });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError('toasts.profile.failedCopy');
    }
  }, [profileUrl, translate]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profileName}'s Profile`,
          text: `Check out ${profileName}'s profile on Vitana`,
          url: profileUrl,
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          notifyError('toasts.profile.shareFailed');
        }
      }
    }
  }, [profileUrl, profileName]);

  const handleDownloadQR = useCallback(() => {
    const svg = document.getElementById("mobile-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${profileHandle || "profile"}-qr.png`;
          a.click();
          URL.revokeObjectURL(url);
          notify('toasts.profile.qrCodeDownloaded2');
        }
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [profileHandle]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            background: "linear-gradient(160deg, hsl(216, 53%, 6%) 0%, hsl(222, 47%, 14%) 50%, hsl(260, 40%, 12%) 100%)",
          }}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-safe-top right-4 mt-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* QR Card */}
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Avatar */}
            <Avatar className="h-20 w-20 border-[3px] border-white/20 shadow-xl mb-4">
              <AvatarImage src={avatarUrl || undefined} alt={profileName} style={avatarPositionStyle(avatarOffsetX, avatarOffsetY)} />
              <AvatarFallback className="text-lg font-bold bg-white/10 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Name */}
            <h2 className="text-xl font-bold text-white mb-1">{profileName}</h2>
            {profileHandle && (
              <p className="text-sm text-white/50 mb-6">@{profileHandle}</p>
            )}

            {/* QR Code Card */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl mb-3">
              <QRCodeSVG
                id="mobile-qr-code"
                value={profileUrl}
                size={220}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>

            {/* Scan label */}
            <p className="text-xs text-white/40 mb-10">
              {translate('qrShare.scanToView', 'Scan to view profile')}
            </p>

            {/* Action buttons */}
            <div className="flex gap-8">
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-2"
              >
                <div className="h-14 w-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] text-white/60 font-medium">
                  {translate('qrShare.shareProfile', 'Share')}
                </span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2"
              >
                <div className="h-14 w-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  {copied ? (
                    <Check className="h-5 w-5 text-green-400" />
                  ) : (
                    <Copy className="h-5 w-5 text-white" />
                  )}
                </div>
                <span className="text-[11px] text-white/60 font-medium">
                  {translate('qrShare.copyLink', 'Copy Link')}
                </span>
              </button>

              <button
                onClick={handleDownloadQR}
                className="flex flex-col items-center gap-2"
              >
                <div className="h-14 w-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] text-white/60 font-medium">
                  {translate('qrShare.download', 'Download')}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
