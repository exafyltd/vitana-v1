import { QrCode, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserProfile } from "@/types/profile";
import { useToast } from "@/hooks/use-toast";

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
      toast({
        title: "Link copied",
        description: "Share it anywhere you like.",
      });
      onOpenChange(false);
    } catch {
      toast({
        title: "Could not share",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShowQR = () => {
    onOpenChange(false);
    onShowQR();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share profile</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Share</div>
              <div className="text-xs text-muted-foreground">
                Open your device's share sheet
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleShowQR}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Show QR code</div>
              <div className="text-xs text-muted-foreground">
                Let someone scan to open your profile
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
