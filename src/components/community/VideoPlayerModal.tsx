import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTrackMediaEvent } from "@/hooks/useShorts";
import { useEffect, useRef } from "react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
    src_url: string;
    thumbnail_url?: string;
  } | null;
}

export const VideoPlayerModal = ({ isOpen, onClose, video }: VideoPlayerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackEvent = useTrackMediaEvent();
  const hasTrackedPlay = useRef(false);

  useEffect(() => {
    if (isOpen && video && videoRef.current) {
      hasTrackedPlay.current = false;
      videoRef.current.play();
    }
  }, [isOpen, video]);

  const handlePlay = () => {
    if (video && !hasTrackedPlay.current) {
      trackEvent.mutate({
        mediaId: video.id,
        eventType: 'play_start',
        mediaType: 'video'
      });
      hasTrackedPlay.current = true;
    }
  };

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-background/95 backdrop-blur">
        <DialogTitle className="sr-only">{video.title}</DialogTitle>
        <div className="relative aspect-[9/16] max-h-[90vh] bg-black">
          <video
            ref={videoRef}
            src={video.src_url}
            poster={video.thumbnail_url}
            controls
            controlsList="nodownload"
            className="w-full h-full object-contain"
            onPlay={handlePlay}
            playsInline
          />
        </div>
        <div className="p-4 bg-background">
          <h3 className="font-semibold text-lg">{video.title}</h3>
        </div>
      </DialogContent>
    </Dialog>
  );
};
