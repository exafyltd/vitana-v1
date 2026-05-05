import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Download,
  Share2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { t } from '@/lib/i18n-toast';

interface PhotoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  caption?: string;
  tags?: string[];
  createdAt?: string;
  showFilmstrip?: boolean;
}

export function PhotoLightbox({
  open,
  onOpenChange,
  images,
  currentIndex,
  onIndexChange,
  caption,
  tags,
  createdAt,
  showFilmstrip = true,
}: PhotoLightboxProps) {
  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom when image changes or dialog closes
  useEffect(() => {
    if (open) {
      setZoomState({ scale: 1, x: 0, y: 0 });
    }
  }, [currentIndex, open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onOpenChange(false);
          break;
        case "ArrowLeft":
          if (currentIndex > 0) onIndexChange(currentIndex - 1);
          break;
        case "ArrowRight":
          if (currentIndex < images.length - 1) onIndexChange(currentIndex + 1);
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
        case "_":
          handleZoomOut();
          break;
        case "0":
          setZoomState({ scale: 1, x: 0, y: 0 });
          break;
        case " ":
          e.preventDefault();
          setZoomState((prev) => ({
            scale: prev.scale === 1 ? 2 : 1,
            x: 0,
            y: 0,
          }));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, images.length, onIndexChange, onOpenChange]);

  const handleDownload = async () => {
    try {
      const response = await fetch(images[currentIndex]);
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

  const handleZoomIn = () => {
    setZoomState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale + 0.5, 3),
    }));
  };

  const handleZoomOut = () => {
    setZoomState((prev) => ({
      ...prev,
      scale: Math.max(prev.scale - 0.5, 1),
      x: prev.scale <= 1.5 ? 0 : prev.x,
      y: prev.scale <= 1.5 ? 0 : prev.y,
    }));
  };

  const handleDoubleClick = () => {
    setZoomState((prev) => {
      const nextScale = prev.scale === 1 ? 2 : prev.scale === 2 ? 3 : 1;
      return {
        scale: nextScale,
        x: nextScale === 1 ? 0 : prev.x,
        y: nextScale === 1 ? 0 : prev.y,
      };
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomState((prev) => {
      const newScale = Math.max(1, Math.min(3, prev.scale + delta));
      return {
        scale: newScale,
        x: newScale === 1 ? 0 : prev.x,
        y: newScale === 1 ? 0 : prev.y,
      };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomState.scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - zoomState.x, y: e.clientY - zoomState.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomState.scale > 1) {
      setZoomState((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[98vw] h-[98vh] p-0 bg-black/80 backdrop-blur-[4px] border-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="dialog"
        aria-label="Photo preview"
      >
        {/* Chrome Bar - Semi-transparent with gradient fade */}
        <div className="absolute top-0 left-0 right-0 z-50 h-14 bg-black/30 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 bg-gradient-to-b from-black/20 to-transparent">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-white/80">{t('screens.diary.timelineDiaryEntry')}</span>
            {createdAt && (
              <>
                <span className="text-white/60">·</span>
                <span className="text-[13px] text-white/80">
                  {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleZoomOut} 
              disabled={zoomState.scale <= 1}
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-white/85 min-w-[3ch] text-center">
              {Math.round(zoomState.scale * 100)}%
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleZoomIn} 
              disabled={zoomState.scale >= 3}
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Container - Flex column to stack image and caption */}
        <div className="flex flex-col items-center justify-center h-full pt-14 pb-16 px-4 gap-4">
          {/* Image Container */}
          <figure
            ref={containerRef}
            className="flex items-center justify-center relative"
            onWheel={handleWheel}
          >
            <img
              ref={imageRef}
              src={images[currentIndex]}
              alt={caption || `Photo ${currentIndex + 1}`}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out select-none hover:scale-[1.01]"
              style={{
                transform: `scale(${zoomState.scale}) translate(${zoomState.x / zoomState.scale}px, ${zoomState.y / zoomState.scale}px)`,
                cursor: zoomState.scale > 1 ? (isDragging ? "grabbing" : "grab") : zoomState.scale === 1 ? "zoom-in" : "zoom-out",
              }}
              onDoubleClick={handleDoubleClick}
              onMouseDown={handleMouseDown}
              draggable={false}
            />

            {/* Navigation Arrows - Positioned relative to the figure */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 disabled:opacity-30 h-12 w-12"
                  onClick={() => onIndexChange(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 disabled:opacity-30 h-12 w-12"
                  onClick={() => onIndexChange(currentIndex + 1)}
                  disabled={currentIndex === images.length - 1}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </figure>

          {/* Caption & Tags Card - Below the image */}
          {(caption || (tags && tags.length > 0)) && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg px-4 py-3 max-w-[80%] animate-fade-in opacity-0 [animation-delay:200ms] [animation-fill-mode:forwards]">
              {caption && (
                <p className="text-[14.5px] font-medium text-white leading-relaxed mb-2">
                  {caption}
                </p>
              )}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-white/15 text-white/80 border-none text-xs font-medium"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filmstrip - Keep at bottom */}
        {showFilmstrip && images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/30 backdrop-blur-md border-t border-white/10 px-6">
            <div className="flex items-center gap-2 h-full overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => onIndexChange(index)}
                  className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all ${
                    index === currentIndex
                      ? "ring-2 ring-primary scale-110"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`View photo ${index + 1}`}
                >
                  <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
