import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
interface PhotoCarouselModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  caption?: string;
  tags?: string[];
  createdAt?: string;
  initialIndex?: number;
}

export function PhotoCarouselModal({
  open,
  onOpenChange,
  images,
  caption,
  tags,
  createdAt,
  initialIndex = 0,
}: PhotoCarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* design-allow-next-line: on-media scrim, theme-independent (photo viewer backdrop) */}
      <DialogContent className="max-w-6xl h-[90vh] p-0 bg-black/95">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 end-4 z-50 text-primary-foreground hover:bg-card/20"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center p-8">
            <Carousel className="w-full max-w-4xl">
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="flex items-center justify-center">
                      <img
                        src={image}
                        alt={`Photo ${index + 1}`}
                        // design-allow-next-line: viewport-bound media box (photo fits the viewport)
                        className="max-h-[70vh] max-w-full object-contain rounded-lg"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="start-4 bg-card/20 border-border/30 text-primary-foreground hover:bg-card/30" />
                  <CarouselNext className="end-4 bg-card/20 border-border/30 text-primary-foreground hover:bg-card/30" />
                </>
              )}
            </Carousel>
          </div>

          {/* design-allow-next-line: on-media scrim, theme-independent (photo viewer caption bar) */}
          <div className="bg-black/90 border-t border-border/10 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {images.length > 1 && (
                  <span className="text-primary-foreground/70 text-sm font-medium">
                    {currentIndex + 1} / {images.length}
                  </span>
                )}
                {createdAt && (
                  <span className="text-primary-foreground/70 text-sm">
                    {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-card/20"
                onClick={() => handleDownload(images[currentIndex])}
              >
                <Download className="h-4 w-4 me-2" />
                {t('screens.diary.download')}
              </Button>
            </div>

            {caption && (
              <p className="text-primary-foreground text-sm max-h-20 overflow-y-auto">{caption}</p>
            )}

            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="bg-card/10 text-primary-foreground border-border/20">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
