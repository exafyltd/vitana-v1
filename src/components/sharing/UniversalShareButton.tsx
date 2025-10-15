import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { UniversalShareDialog } from "./UniversalShareDialog";
import { analytics } from "@/lib/analytics";

interface ShareableContent {
  type: "group" | "event" | "meetup" | "live_room" | "profile" | "post" | "service" | "music";
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  url?: string;
}

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

  const handleShareClick = () => {
    analytics.trackShare(
      "share_opened",
      "universal",
      content.id,
      content.type
    );
    setDialogOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleShareClick}
        className={className}
      >
        <Share2 className="h-4 w-4" />
        {showLabel && size !== "icon" && <span className="ml-2">Share</span>}
      </Button>

      <UniversalShareDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        content={content}
      />
    </>
  );
}
