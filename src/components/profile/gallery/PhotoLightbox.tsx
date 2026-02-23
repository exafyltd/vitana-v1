import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { GalleryPhoto } from "@/hooks/useProfileGallery";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const photo = photos[current];

  const goNext = useCallback(() => setCurrent((p) => (p + 1) % photos.length), [photos.length]);
  const goPrev = useCallback(() => setCurrent((p) => (p - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 60) {
      diff > 0 ? goPrev() : goNext();
    }
    setTouchStart(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Navigation */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 h-12 w-12"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 h-12 w-12"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.image_url}
          alt={photo.caption || 'Photo'}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        {photo.caption && (
          <p className="text-white/80 text-sm mt-3 text-center max-w-lg">{photo.caption}</p>
        )}
        <p className="text-white/40 text-xs mt-2">{current + 1} / {photos.length}</p>
      </div>
    </div>
  );
}
