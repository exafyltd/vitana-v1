import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTrackMediaEvent } from "@/hooks/useShorts";
import { useEffect, useRef, useState } from "react";
import { Trash2, Play, Pause, Volume2, VolumeX, Share2, Eye } from "lucide-react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    user_id?: string;
    title: string;
    src_url: string;
    thumbnail_url?: string;
  } | null;
  onDelete?: () => void;
}

export const VideoPlayerModal = ({ isOpen, onClose, video, onDelete }: VideoPlayerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackEvent = useTrackMediaEvent();
  const hasTrackedPlay = useRef(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (isOpen && video && videoRef.current) {
      hasTrackedPlay.current = false;
      handleVideoPlay();
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

  const handleVideoPlay = async () => {
    try {
      await videoRef.current?.play();
      setIsPlaying(true);
    } catch (e) {
      console.log('Autoplay prevented:', e);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleShare = async () => {
    if (navigator.share && video) {
      try {
        await navigator.share({
          title: video.title,
          url: window.location.href
        });
      } catch (e) {
        console.log('Share failed:', e);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/70 backdrop-blur-xl border-0 animate-fade-in">
        <DialogTitle className="sr-only">{video.title}</DialogTitle>
        
        {/* Ambient blurred background */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
          style={{ backgroundImage: `url(${video.thumbnail_url})` }}
        />

        {/* Main content container */}
        <div className="relative z-10 flex items-center justify-center h-full p-8">
          {/* Video frame with gradient border */}
          <div 
            className="relative w-auto max-w-[500px] h-[90vh] rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(56, 189, 248, 0.3))',
              padding: '2px'
            }}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden">
              {/* Video element */}
              <video
                ref={videoRef}
                src={video.src_url}
                poster={video.thumbnail_url}
                className="w-full h-full object-cover"
                onPlay={handlePlay}
                onPlaying={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                playsInline
                controlsList="nodownload"
              />

              {/* Custom controls overlay */}
              <div 
                className={`absolute inset-0 transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={togglePlay}
              >
                {/* Center play/pause button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="pointer-events-auto w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 text-white fill-white" />
                    ) : (
                      <Play className="w-10 h-10 text-white fill-white ml-1" />
                    )}
                  </button>
                </div>

                {/* Bottom left: Duration & Views */}
                <div className="absolute bottom-16 left-4 flex items-center gap-3 pointer-events-none">
                  <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                    <span className="text-white text-sm font-medium">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-medium">1.2K</span>
                  </div>
                </div>

                {/* Bottom right: Volume & Share */}
                <div className="absolute bottom-16 right-4 flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <Share2 className="w-5 h-5 text-white" />
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Gradient progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, rgb(139, 92, 246), rgb(56, 189, 248))'
                  }}
                />
              </div>

              {/* Title overlay when paused */}
              {!isPlaying && (
                <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/70 to-transparent">
                  <h3 className="text-white text-xl font-semibold">{video.title}</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
