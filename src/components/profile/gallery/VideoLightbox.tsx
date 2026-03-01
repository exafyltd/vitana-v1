import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface VideoItem {
  id: string;
  file_url: string;
  title?: string;
  duration?: number | null;
}

interface VideoLightboxProps {
  videos: VideoItem[];
  initialIndex: number;
  onClose: () => void;
}

export function VideoLightbox({ videos, initialIndex, onClose }: VideoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const video = videos[currentIndex];

  useEffect(() => {
    // Auto-play when opening or switching
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  const goNext = () => {
    if (currentIndex < videos.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 bg-black/95 border-none">
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex items-center justify-center h-full relative">
          {videos.length > 1 && currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-50 text-white hover:bg-white/20 h-10 w-10 rounded-full"
              onClick={goPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <video
            ref={videoRef}
            key={video.id}
            src={video.file_url}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-lg"
          />

          {videos.length > 1 && currentIndex < videos.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-50 text-white hover:bg-white/20 h-10 w-10 rounded-full"
              onClick={goNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-black/80 border-t border-white/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-white text-sm font-medium">{video.title || "Video"}</p>
            {videos.length > 1 && (
              <span className="text-white/60 text-sm">
                {currentIndex + 1} / {videos.length}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
