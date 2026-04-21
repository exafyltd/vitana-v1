import { useRef, useEffect, useState, useCallback } from 'react';
import { Heart, Share2, ArrowLeft, Volume2, VolumeX, Play, Pause, Loader2, RotateCcw, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { KebabMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu-kebab';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

type VideoState = 'loading' | 'ready' | 'playing' | 'paused' | 'autoplay-blocked' | 'stalled' | 'error';

interface MobileShortSlideProps {
  video: {
    id?: string;
    title: string;
    description?: string;
    creator: string;
    creatorAvatar?: string | null;
    src_url?: string;
    thumbnail_url?: string;
    thumbnailImage?: string;
    likes: number;
    tags?: string[];
    isLive?: boolean;
    user_id?: string;
  };
  isActive: boolean;
  onLike: () => void;
  onShare: () => void;
  onBack: () => void;
  isLiked?: boolean;
  currentUserId?: string;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function MobileShortSlide({
  video,
  isActive,
  onLike,
  onShare,
  onBack,
  isLiked = false,
  currentUserId,
  onDelete,
  onEdit,
}: MobileShortSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { translate } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>('loading');
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start unmuted on mobile - user preference stored in sessionStorage
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = sessionStorage.getItem('shorts_audio_enabled');
      return saved === 'false';
    } catch {
      return false; // Default: sound ON
    }
  });
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const lastTapRef = useRef<number>(0);

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const startStallTimer = useCallback((ms: number) => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => {
      setVideoState(prev => {
        // Only set stalled if we're not already playing or in error
        if (prev !== 'playing' && prev !== 'error') return 'stalled';
        return prev;
      });
    }, ms);
  }, [clearStallTimer]);

  // Cleanup stall timer on unmount
  useEffect(() => {
    return () => clearStallTimer();
  }, [clearStallTimer]);

  // Handle autoplay when slide becomes active
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      setVideoState('loading');
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current.volume = 1;

      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setVideoState('playing');
        if (!isMuted) {
          window.dispatchEvent(new CustomEvent('foreground-audio-intent', {
            detail: { source: 'shorts-autoplay' }
          }));
        }
      }).catch(() => {
        // Autoplay blocked — try muted fallback (iPad often requires muted autoplay)
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            setVideoState('playing');
            setIsMuted(true);
          }).catch(() => {
            setVideoState('autoplay-blocked');
          });
        }
      });
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      clearStallTimer();
    }
  }, [isActive, isMuted, clearStallTimer]);

  // Video event handlers
  const handleCanPlay = useCallback(() => {
    clearStallTimer();
    setVideoState(prev => prev === 'loading' ? 'ready' : prev);
  }, [clearStallTimer]);

  const handleLoadedData = useCallback(() => {
    clearStallTimer();
  }, [clearStallTimer]);

  const handlePlaying = useCallback(() => {
    clearStallTimer();
    setVideoState('playing');
    setIsPlaying(true);
  }, [clearStallTimer]);

  const handlePause = useCallback(() => {
    if (videoState !== 'error' && videoState !== 'stalled' && videoState !== 'autoplay-blocked') {
      setVideoState('paused');
    }
    setIsPlaying(false);
  }, [videoState]);

  const handleWaiting = useCallback(() => {
    if (isActive) startStallTimer(5000);
  }, [isActive, startStallTimer]);

  const handleStalled = useCallback(() => {
    if (isActive) startStallTimer(5000);
  }, [isActive, startStallTimer]);

  const handleError = useCallback(() => {
    clearStallTimer();
    setVideoState('error');
    setIsPlaying(false);
  }, [clearStallTimer]);

  // Manual play handler for autoplay-blocked / retry
  const handleManualPlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    setVideoState('loading');
    videoRef.current.play().then(() => {
      setIsPlaying(true);
      setVideoState('playing');
    }).catch(() => {
      videoRef.current!.muted = true;
      videoRef.current!.play().then(() => {
        setIsPlaying(true);
        setVideoState('playing');
        setIsMuted(true);
      }).catch(() => {
        setVideoState('error');
      });
    });
  }, []);

  // Retry handler for error/stalled
  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    setVideoState('loading');
    // Reload source
    videoRef.current.load();
    videoRef.current.play().then(() => {
      setIsPlaying(true);
      setVideoState('playing');
    }).catch(() => {
      setVideoState('autoplay-blocked');
    });
  }, []);

  // Handle tap to play/pause
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      onLike();
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 800);
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;

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
      const newMutedState = !isMuted;
      try {
        sessionStorage.setItem('shorts_audio_enabled', (!newMutedState).toString());
      } catch { /* ignore */ }

      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);

      if (!newMutedState) {
        videoRef.current.volume = 1;
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => { /* ignore */ });

        window.dispatchEvent(new CustomEvent('foreground-audio-intent', {
          detail: { source: 'shorts' }
        }));
      }
    }
  }, [isMuted]);

  const thumbnailUrl = video.thumbnail_url || video.thumbnailImage;
  const showThumbnailFallback = videoState === 'loading' || videoState === 'error' || videoState === 'stalled' || videoState === 'autoplay-blocked';

  return (
    <div
      className="h-[100dvh] w-full snap-start snap-always relative bg-black flex-shrink-0"
      onClick={handleTap}
    >
      {/* Thumbnail fallback layer — always behind video */}
      {thumbnailUrl && showThumbnailFallback && (
        <img
          src={thumbnailUrl}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover z-[1]"
        />
      )}

      {/* Video */}
      <video
        ref={videoRef}
        src={video.src_url}
        poster={thumbnailUrl}
        className="absolute inset-0 w-full h-full object-cover z-[2]"
        loop
        muted={isMuted}
        playsInline
        // @ts-ignore — legacy WebKit attribute for iPad WebView
        webkit-playsinline=""
        crossOrigin="anonymous"
        preload={isActive ? "auto" : "metadata"}
        onCanPlay={handleCanPlay}
        onLoadedData={handleLoadedData}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onStalled={handleStalled}
        onError={handleError}
      />

      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none z-[3]" />

      {/* Loading spinner overlay */}
      {isActive && videoState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Autoplay blocked — tap to play */}
      {isActive && videoState === 'autoplay-blocked' && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <button
            onClick={handleManualPlay}
            className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <Play className="h-10 w-10 text-white ml-1" />
          </button>
        </div>
      )}

      {/* Error / Stalled — tap to retry */}
      {isActive && (videoState === 'error' || videoState === 'stalled') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3">
          <button
            onClick={handleRetry}
            className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <RotateCcw className="h-8 w-8 text-white" />
          </button>
          <span className="text-white text-sm font-medium drop-shadow-lg">
            {videoState === 'error' ? 'Failed to load — tap to retry' : 'Buffering — tap to retry'}
          </span>
        </div>
      )}

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

        <div className="flex items-center gap-2">
          {/* Owner kebab — delete */}
          {currentUserId && video.user_id === currentUserId && (onEdit || onDelete) && (
            <div onClick={(e) => e.stopPropagation()}>
              <KebabMenu className="!h-10 !w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50">
                {onEdit && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit details
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </KebabMenu>
            </div>
          )}

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
          <span className="text-white text-xs font-medium drop-shadow-lg">{translate('common.share', 'Share')}</span>
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
