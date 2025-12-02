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
import { Download, Copy, Check, Loader2, Smartphone, Square } from "lucide-react";
import { ShareableEventCard } from "./ShareableEventCard";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { toast } from "sonner";

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

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      // Scale factor for high-res output
      const scale = format === "story" ? 1080 / (1080 * 0.3) : 1080 / (1080 * 0.3);
      
      const canvas = await html2canvas(cardRef.current, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
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

        toast.success("Image downloaded! Ready to share on Instagram");
      }, "image/png", 1.0);
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [format, event.title]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      toast.success("Link copied for Link Sticker!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [shareUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
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

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">How to share:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Download the image above</li>
              <li>Open Instagram and create a Story or Post</li>
              <li>Select the downloaded image</li>
              <li>Add a Link Sticker with the copied link</li>
              <li>Share with your followers!</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
