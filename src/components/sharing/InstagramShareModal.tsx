import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, Check, Loader2, Smartphone, Square, Share2, ExternalLink } from "lucide-react";
import { ShareableEventCard } from "./ShareableEventCard";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { useIsMobile } from "@/hooks/use-mobile";
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

interface InstagramShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    image_url?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    description?: string;
  };
  shareUrl: string;
}

type ImageFormat = "story" | "square";

export function InstagramShareModal({
  open,
  onOpenChange,
  event,
  shareUrl,
}: InstagramShareModalProps) {
  const [format, setFormat] = useState<ImageFormat>("story");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Generate image blob from the card
  const generateImageBlob = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    const scale = format === "story" ? 1080 / (1080 * 0.3) : 1080 / (1080 * 0.3);
    
    const canvas = await html2canvas(cardRef.current, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }, [format]);

  // Check if Web Share API supports sharing files
  const canUseWebShare = useCallback(() => {
    return isMobile && navigator.share && navigator.canShare;
  }, [isMobile]);

  // Share directly using Web Share API (mobile only)
  const handleDirectShare = useCallback(async () => {
    if (!canUseWebShare()) {
      notifyError('toasts.sharing.directSharingNotSupportedThisDevice');
      return;
    }

    setIsGenerating(true);
    try {
      const blob = await generateImageBlob();
      if (!blob) {
        notifyError('toasts.sharing.failedGenerateImage');
        return;
      }

      const file = new File(
        [blob], 
        `${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${format}.png`,
        { type: "image/png" }
      );

      const shareData = {
        files: [file],
        title: event.title,
        text: `Check out this event: ${event.title}\n${shareUrl}`,
      };

      // Check if we can share files
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        notifySuccess('toasts.sharing.sharedSuccessfully');
        onOpenChange(false);
      } else {
        // Fallback: share without file
        await navigator.share({
          title: event.title,
          text: `Check out this event: ${event.title}`,
          url: shareUrl,
        });
        notifySuccess('toasts.sharing.linkSharedDownloadImageIncludeIt');
      }
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== "AbortError") {
        console.error("Share error:", error);
        notifyError('toasts.sharing.sharingFailedTryDownloadingInstead');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [canUseWebShare, generateImageBlob, event.title, format, shareUrl, onOpenChange]);

  // Open Instagram app directly (mobile)
  const handleOpenInstagram = useCallback(() => {
    // Copy link first for easy pasting
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    
    // Try to open Instagram app
    const instagramUrl = "instagram://app";
    
    // Create a hidden link and click it
    const link = document.createElement("a");
    link.href = instagramUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    
    // Try to open, with fallback
    const startTime = Date.now();
    link.click();
    
    // Check if app opened (page loses focus) or fallback to web
    setTimeout(() => {
      document.body.removeChild(link);
      if (Date.now() - startTime < 1600) {
        // App didn't open, open web version
        window.open("https://instagram.com", "_blank");
      }
    }, 1500);
    
    notifySuccess('toasts.sharing.linkCopiedPasteItYourInstagram');
  }, [shareUrl]);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImageBlob();
      if (!blob) {
        notifyError('toasts.sharing.failedGenerateImage');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${format}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifySuccess('toasts.sharing.imageDownloadedReadyShareInstagram');
    } catch (error) {
      console.error("Error generating image:", error);
      notifyError('toasts.sharing.failedGenerateImage');
    } finally {
      setIsGenerating(false);
    }
  }, [generateImageBlob, format, event.title]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      notifySuccess('toasts.sharing.linkCopiedForLinkSticker');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      notifyError('toasts.sharing.failedCopyLink');
    }
  }, [shareUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <InstagramIcon className="h-5 w-5" />
            Share to Instagram
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selector */}
          <Tabs value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="story" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Story (9:16)
              </TabsTrigger>
              <TabsTrigger value="square" className="gap-2">
                <Square className="h-4 w-4" />
                Feed (1:1)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Preview */}
          <div className="flex justify-center bg-muted/50 rounded-lg p-4">
            <ShareableEventCard ref={cardRef} event={event} format={format} />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Mobile: Direct Share Button (Primary) */}
            {isMobile && canUseWebShare() && (
              <Button
                onClick={handleDirectShare}
                disabled={isGenerating}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Share to Instagram
                  </>
                )}
              </Button>
            )}

            {/* Mobile: Open Instagram App */}
            {isMobile && (
              <Button
                onClick={handleOpenInstagram}
                variant={canUseWebShare() ? "outline" : "default"}
                className="w-full gap-2"
                size="lg"
              >
                <ExternalLink className="h-4 w-4" />
                Open Instagram App
              </Button>
            )}

            {/* Download Button */}
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              variant={isMobile ? "outline" : "default"}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating && !isMobile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Image
                </>
              )}
            </Button>

            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link (for Link Sticker)
                </>
              )}
            </Button>
          </div>

          {/* Instructions - contextual based on device */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              {isMobile ? "Quick share:" : "How to share:"}
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              {isMobile ? (
                <>
                  <li>Tap "Share to Instagram" to open your share menu</li>
                  <li>Select Instagram from the apps</li>
                  <li>Add a Link Sticker with the copied link</li>
                  <li>Share with your followers!</li>
                </>
              ) : (
                <>
                  <li>Download the image above</li>
                  <li>Open Instagram and create a Story or Post</li>
                  <li>Select the downloaded image</li>
                  <li>Add a Link Sticker with the copied link</li>
                  <li>Share with your followers!</li>
                </>
              )}
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
