import { useRef, useEffect, useState, useCallback } from 'react';
import { Heart, Share2, MessageCircle, ArrowLeft, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileShortSlideProps {
  video: {
    id: string;
    title: string;
    description?: string;
    creator: string;
    creatorAvatar?: string | null;
    src_url: string;
    thumbnail_url?: string;
    thumbnailImage?: string;
    likes: number;
    tags?: string[];
    isLive?: boolean;
  };
  isActive: boolean;
  onLike: () => void;
  onShare: () => void;
  onBack: () => void;
  isLiked?: boolean;
}

export function MobileShortSlide({
  video,
  isActive,
  onLike,
  onShare,
  onBack,
  isLiked = false,
}: MobileShortSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Handle autoplay when slide becomes active
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked, user needs to tap
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  // Handle tap to play/pause
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    // Double tap detection for like
    if (timeSinceLastTap < 300) {
      onLike();
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 800);
      lastTapRef.current = 0;
      return;
    }
    
    lastTapRef.current = now;
    
    // Single tap for play/pause (with small delay to detect double tap)
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= 300 && lastTapRef.current !== 0) {
        if (!videoRef.current) return;
        
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          videoRef.current.play();
          setIsPlaying(true);
        }
        
        setShowPlayIcon(true);
        setTimeout(() => setShowPlayIcon(false), 500);
      }
    }, 300);
  }, [isPlaying, onLike]);

  // Toggle mute
  const handleMuteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const thumbnailUrl = video.thumbnail_url || video.thumbnailImage;

  return (
    <div 
      className="h-[100dvh] w-full snap-start snap-always relative bg-black flex-shrink-0"
      onClick={handleTap}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={video.src_url}
        poster={thumbnailUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        preload={isActive ? "auto" : "metadata"}
      />

      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Top overlay - Back button and labels */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 safe-area-inset-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-black/30 backdrop-blur-sm text-white border-none">
            Shorts
          </Badge>
          {video.isLive && (
            <Badge variant="destructive" className="animate-pulse">
              LIVE
            </Badge>
          )}
        </div>

        {/* Mute toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMuteToggle}
          className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>

      {/* Right side action stack */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all",
            isLiked && "bg-red-500/80"
          )}>
            <Heart className={cn(
              "h-6 w-6 transition-all",
              isLiked ? "fill-white text-white" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {video.likes}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">Share</span>
        </button>
      </div>

      {/* Bottom overlay - Creator info and caption */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 z-10 safe-area-inset-bottom">
        {/* Creator */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={video.creatorAvatar || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {video.creator.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-base drop-shadow-lg">
            @{video.creator}
          </span>
        </div>

        {/* Title and description */}
        <h3 className="text-white font-medium text-base mb-1 drop-shadow-lg line-clamp-1">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-white/80 text-sm drop-shadow-lg line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {video.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-white/70 text-xs drop-shadow-lg">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Center play/pause indicator */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="h-20 w-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-out">
            {isPlaying ? (
              <Pause className="h-10 w-10 text-white" />
            ) : (
              <Play className="h-10 w-10 text-white ml-1" />
            )}
          </div>
        </div>
      )}

      {/* Double-tap heart animation */}
      {showHeartAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-ping" />
        </div>
      )}

      <style>{`
        @keyframes fade-out {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.2); }
        }
        .animate-fade-out {
          animation: fade-out 0.5s ease-out forwards;
        }
        .safe-area-inset-top {
          padding-top: max(1rem, env(safe-area-inset-top));
        }
        .safe-area-inset-bottom {
          padding-bottom: max(2rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
