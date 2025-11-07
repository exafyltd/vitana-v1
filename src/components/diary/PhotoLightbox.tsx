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
        className="max-w-[98vw] h-[98vh] p-0 bg-black/60 backdrop-blur-md border-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Chrome Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 h-14 bg-card/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Timeline / Diary entry</span>
            {createdAt && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomState.scale <= 1}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3ch] text-center">
              {Math.round(zoomState.scale * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomState.scale >= 3}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <figure
          ref={containerRef}
          className="flex items-center justify-center h-full pt-14 pb-16 px-4"
          onWheel={handleWheel}
        >
          <img
            ref={imageRef}
            src={images[currentIndex]}
            alt={caption || `Photo ${currentIndex + 1}`}
            className="max-w-[92vw] max-h-[calc(88vh-7rem)] object-contain rounded-2xl shadow-2xl transition-transform duration-200 ease-out select-none"
            style={{
              transform: `scale(${zoomState.scale}) translate(${zoomState.x / zoomState.scale}px, ${zoomState.y / zoomState.scale}px)`,
              cursor: zoomState.scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            }}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            draggable={false}
          />

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 disabled:opacity-30 h-12 w-12"
                onClick={() => onIndexChange(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 disabled:opacity-30 h-12 w-12"
                onClick={() => onIndexChange(currentIndex + 1)}
                disabled={currentIndex === images.length - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </figure>

        {/* Filmstrip */}
        {showFilmstrip && images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-md border-t border-white/10 px-6">
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
                >
                  <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Caption & Tags Overlay */}
        {(caption || (tags && tags.length > 0)) && (
          <div className="absolute bottom-20 left-6 right-6 bg-card/90 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-2 max-w-xl">
            {caption && <p className="text-sm text-foreground">{caption}</p>}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-secondary/50 backdrop-blur-sm border border-white/10 text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
