/**
 * Compact, tap-to-enlarge media frame for community/profile posts.
 *
 * History: members upload portrait smartphone selfies. A fixed 16:9 crop
 * chopped off heads; showing the full image at natural height made the feed
 * balloon. The chosen direction is an inset thumbnail — the whole image is
 * shown small (face intact, nothing cropped) and tapping opens it full-size in
 * a lightbox. Keeps the feed text-first while the full photo is one tap away.
 */
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n-toast";

export function FeedMedia({
  imageUrl,
  videoUrl,
  className,
  alt = "",
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  className?: string;
  alt?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!videoUrl && !imageUrl) return null;

  const openLightbox = (e: React.MouseEvent) => {
    // The post card itself navigates to the author on click — keep the tap here.
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openLightbox}
        aria-label={t("screens.home.enlargeMedia")}
        className={cn(
          "mt-3 mx-auto block w-fit max-w-[60%] overflow-hidden rounded-xl border border-border/40 " +
            "bg-muted shadow-sm transition-transform hover:scale-[1.02] focus:outline-none " +
            "focus:ring-2 focus:ring-primary",
          className,
        )}
      >
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={imageUrl || undefined}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            className="max-h-60 w-auto object-contain"
          />
        ) : (
          <img
            src={imageUrl as string}
            alt={alt}
            loading="lazy"
            className="max-h-60 w-auto object-contain"
          />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[96vw] w-auto border-none bg-black/85 p-0 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("screens.community.close")}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
          {videoUrl ? (
            <video
              src={videoUrl}
              poster={imageUrl || undefined}
              controls
              autoPlay
              playsInline
              className="max-h-[88vh] max-w-[96vw] rounded-lg object-contain"
            />
          ) : (
            <img
              src={imageUrl as string}
              alt={alt}
              className="max-h-[88vh] max-w-[96vw] rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
