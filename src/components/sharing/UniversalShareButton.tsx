import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { UniversalShareDialog } from "./UniversalShareDialog";
import { analytics } from "@/lib/analytics";
import { useTranslation } from "@/hooks/useTranslation";
import { useNativeShare } from "@/hooks/useNativeShare";
import { getShareUrl } from "@/lib/shareUrl";
import type { ShareableContent } from "@/types/sharing";

interface UniversalShareButtonProps {
  content: ShareableContent;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

export function UniversalShareButton({
  content,
  variant = "ghost",
  size = "sm",
  showLabel = true,
  className,
}: UniversalShareButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { translate } = useTranslation();

  const { isAvailable: canNativeShare, share: nativeShare } = useNativeShare({
    contentId: content.id,
    contentType: content.type,
  });

  const shareUrl =
    content.url ||
    getShareUrl(
      content.type as "event" | "meetup" | "group" | "profile" | "post",
      content.id,
      { utm_source: "share", utm_medium: "personal", slug: content.slug }
    );

  const handleShareClick = async () => {
    if (isSharing) return;

    analytics.trackShare("share_opened", "universal", content.id, content.type);

    if (canNativeShare) {
      setIsSharing(true);
      const result = await nativeShare({
        title: content.title,
        text: content.description || content.title,
        url: shareUrl,
      });
      setIsSharing(false);

      // Only fall back to dialog on failure, not on user cancel
      if (result === "failed") {
        setDialogOpen(true);
      }
      return;
    }

    setDialogOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleShareClick}
        disabled={isSharing}
        className={className}
      >
        <Share2 className="h-4 w-4" />
        {showLabel && size !== "icon" && (
          <span className="ml-2">{translate("common.share", "Share")}</span>
        )}
      </Button>

      <UniversalShareDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        content={content}
      />
    </>
  );
}
