import { QrCode, Send, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserProfile } from "@/types/profile";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError, t } from '@/lib/i18n-toast';
import { resolveProfileUserId } from '@/lib/resolveProfileUserId';
import { useSendInMessage } from '@/components/messages/SendInMessageSheet';

interface ShareProfileSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  /** Public URL to share. */
  shareUrl: string;
  onShowQR: () => void;
}

// Lightweight share sheet: mirrors the event-sharing pattern.
// Primary action: native device share via Web Share API (falls back to
// clipboard copy when navigator.share is unavailable, e.g. desktop).
// Secondary action: open the full-screen QR screen.
export function ShareProfileSheet({
  isOpen,
  onOpenChange,
  profile,
  shareUrl,
  onShowQR,
}: ShareProfileSheetProps) {
  const { toast } = useToast();
  // VTID-05321: send this profile to a chat (the gateway keys profiles by user id).
  const profileUserId = resolveProfileUserId(profile.user_id, profile.id);
  const { openSendInMessage, sendInMessageSheet } = useSendInMessage(
    profileUserId ? { kind: 'profile', id: profileUserId } : null,
    profile.name,
  );
  const handleSendInMessage = () => {
    onOpenChange(false);
    openSendInMessage();
  };

  const handleNativeShare = async () => {
    const payload = {
      title: `${profile.name}'s profile`,
      text: `Check out ${profile.name}'s profile on MAXINA`,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(payload);
        onOpenChange(false);
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        // Fall through to clipboard fallback on unexpected failure.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      notify('toasts.profile.linkCopied', 'toasts.profile.shareItAnywhereYouLike');
      onOpenChange(false);
    } catch {
      notifyError('toasts.profile.couldNotShare', 'toasts.profile.pleaseTryAgain');
    }
  };

  const handleShowQR = () => {
    onOpenChange(false);
    onShowQR();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('screens.profile.shareProfile2')}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-start hover:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{t('screens.profile.share')}</div>
              <div className="text-xs text-muted-foreground">
                {t('screens.profile.openYourDeviceSShareSheet')}
              </div>
            </div>
          </button>

          {profileUserId && (
            <button
              type="button"
              onClick={handleSendInMessage}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-start hover:bg-accent transition-colors"
              data-testid="profile-send-in-message"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Send className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{t('inbox.shared.sendInMessage')}</div>
                <div className="text-xs text-muted-foreground">{t('inbox.shared.sheetTitle', { kind: t('inbox.shared.kind.profile') })}</div>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={handleShowQR}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-start hover:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{t('screens.profile.showQrCode')}</div>
              <div className="text-xs text-muted-foreground">
                {t('screens.profile.letSomeoneScanOpenYourProfile')}
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
    {sendInMessageSheet}
    </>
  );
}
