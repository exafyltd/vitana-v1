import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTrackMediaEvent } from "@/hooks/useShorts";
import { getShareUrl } from "@/lib/shareUrl";
import { useEffect, useRef, useState, useCallback } from "react";
import { Trash2, Play, Pause, Volume2, VolumeX, Share2, MessageCircle, Eye, ChevronLeft, ChevronRight, X, Loader2, RotateCcw } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';
import { ShortCommentsSheet } from "./ShortCommentsSheet";

type VideoState = 'loading' | 'ready' | 'playing' | 'paused' | 'autoplay-blocked' | 'stalled' | 'error';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    user_id?: string;
    title: string;
    src_url: string;
    thumbnail_url?: string;
    commentsCount?: number;
  } | null;
  onDelete?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export const VideoPlayerModal = ({ 
  isOpen, 
  onClose, 
  video, 
  onDelete,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false
}: VideoPlayerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackEvent = useTrackMediaEvent();
  const hasTrackedPlay = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout>();
  const touchStartRef = useRef<number>(0);
  const hasInteracted = useRef(false);
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showArrowsMobile, setShowArrowsMobile] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>('loading');
  const [showComments, setShowComments] = useState(false);

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
        if (prev !== 'playing' && prev !== 'error') return 'stalled';
        return prev;
      });
    }, ms);
  }, [clearStallTimer]);

  useEffect(() => {
    return () => clearStallTimer();
  }, [clearStallTimer]);

  useEffect(() => {
    if (isOpen && video && videoRef.current) {
      hasTrackedPlay.current = false;
      setIsTransitioning(false);
      setShowArrowsMobile(false);
      hasInteracted.current = false;
      setVideoState('loading');
      setShowComments(false);
      handleVideoPlay();
    }
  }, [isOpen, video]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (hasPrevious && onPrevious) handleNavigation(onPrevious);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (hasNext && onNext) handleNavigation(onNext);
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrevious, onNext, onPrevious, onClose]);

  // Detect pointer type
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    const update = () => setIsCoarsePointer(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Auto-hide arrows on mobile after 2s
  useEffect(() => {
    if (showArrowsMobile) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setShowArrowsMobile(false), 2000);
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [showArrowsMobile]);

  const handleInteraction = () => {
    hasInteracted.current = true;
    setShowArrowsMobile(true);
  };

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
      setVideoState('playing');
    } catch (e) {
      console.log('Autoplay prevented:', e);
      // Try muted fallback for iPad
      if (videoRef.current) {
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
          setIsPlaying(true);
          setVideoState('playing');
          setIsMuted(true);
        } catch {
          setVideoState('autoplay-blocked');
        }
      }
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
    if (!video) return;

    const shareUrl = video.id ? getShareUrl('short', video.id) : window.location.href;
    const shareData = {
      title: video.title,
      text: `Check out "${video.title}" on Vitana`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // Fall through to clipboard fallback on any other error.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      notify('toasts.community.linkCopied', 'toasts.community.shortLinkCopiedClipboard');
    } catch {
      notifyError('toasts.community.couldNotShare', 'toasts.community.pleaseTryAgain');
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

  const handleNavigation = (callback: () => void) => {
    setIsTransitioning(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setTimeout(() => {
      callback();
    }, 150);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    handleInteraction();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && hasNext && onNext) {
        handleNavigation(onNext);
        handleInteraction();
      } else if (diff < 0 && hasPrevious && onPrevious) {
        handleNavigation(onPrevious);
        handleInteraction();
      }
    }
  };

  // Video event handlers for state tracking
  const handleCanPlay = useCallback(() => {
    clearStallTimer();
    setVideoState(prev => prev === 'loading' ? 'ready' : prev);
  }, [clearStallTimer]);

  const handleLoadedData = useCallback(() => {
    clearStallTimer();
  }, [clearStallTimer]);

  const handleVideoPlaying = useCallback(() => {
    clearStallTimer();
    setVideoState('playing');
    setIsPlaying(true);
  }, [clearStallTimer]);

  const handleVideoPause = useCallback(() => {
    if (videoState !== 'error' && videoState !== 'stalled' && videoState !== 'autoplay-blocked') {
      setVideoState('paused');
    }
    setIsPlaying(false);
  }, [videoState]);

  const handleWaiting = useCallback(() => {
    startStallTimer(5000);
  }, [startStallTimer]);

  const handleStalled = useCallback(() => {
    startStallTimer(5000);
  }, [startStallTimer]);

  const handleVideoError = useCallback(() => {
    clearStallTimer();
    setVideoState('error');
    setIsPlaying(false);
  }, [clearStallTimer]);

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

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    setVideoState('loading');
    videoRef.current.load();
    videoRef.current.play().then(() => {
      setIsPlaying(true);
      setVideoState('playing');
    }).catch(() => {
      setVideoState('autoplay-blocked');
    });
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showArrows = !isCoarsePointer || showArrowsMobile;
  const showThumbnailFallback = videoState === 'loading' || videoState === 'error' || videoState === 'stalled' || videoState === 'autoplay-blocked';

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/70 backdrop-blur-xl border-0 animate-fade-in overflow-visible">
        <DialogTitle className="sr-only">{video.title}</DialogTitle>
        
        {/* Ambient blurred background */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110 -z-10"
          style={{ backgroundImage: `url(${video.thumbnail_url})` }}
        />

        {/* Custom premium close button */}
        <div className="fixed top-6 right-6 z-[9999] pointer-events-none">
          <DialogClose asChild>
            <button
              aria-label={t('screens.community.close')}
              onClick={onClose}
              className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 
                flex items-center justify-center shadow-lg transition-all duration-300 
                hover:bg-white/20 hover:rotate-90 hover:scale-105 cursor-pointer"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </DialogClose>
        </div>

        {/* Main content container */}
        <div 
          className="relative z-10 flex items-center justify-center h-full p-8 overflow-visible"
          onMouseMove={handleInteraction}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Left navigation arrow */}
          {hasPrevious && onPrevious && (
            <button
              aria-label={t('screens.community.previousVideo')}
              onClick={() => {
                handleNavigation(onPrevious);
                handleInteraction();
              }}
              className={`absolute left-8 top-1/2 -translate-y-1/2 z-[9999] w-12 h-12 rounded-full 
                bg-white/12 backdrop-blur-sm text-white shadow-lg border border-white/20 
                flex items-center justify-center transition-all duration-300 cursor-pointer pointer-events-auto
                hover:bg-white/18 hover:scale-105 hover:ring-2 hover:ring-accent/40
                ${showArrows ? 'opacity-100' : 'opacity-0'}`}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
          
          {/* Right navigation arrow */}
          {hasNext && onNext && (
            <button
              aria-label={t('screens.community.nextVideo')}
              onClick={() => {
                handleNavigation(onNext);
                handleInteraction();
              }}
              className={`absolute right-8 top-1/2 -translate-y-1/2 z-[9999] w-12 h-12 rounded-full 
                bg-white/12 backdrop-blur-sm text-white shadow-lg border border-white/20 
                flex items-center justify-center transition-all duration-300 cursor-pointer pointer-events-auto
                hover:bg-white/18 hover:scale-105 hover:ring-2 hover:ring-accent/40
                ${showArrows ? 'opacity-100' : 'opacity-0'}`}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Video frame with gradient border */}
          <div className="relative flex items-center justify-center overflow-visible">
            <div 
              className={`relative w-auto max-w-[500px] h-[90vh] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300
                ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(56, 189, 248, 0.3))',
              padding: '2px'
            }}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden">
              {/* Thumbnail fallback layer */}
              {video.thumbnail_url && showThumbnailFallback && (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover z-[1]"
                />
              )}

              {/* Video element */}
              <video
                ref={videoRef}
                src={video.src_url}
                poster={video.thumbnail_url}
                className="w-full h-full object-cover relative z-[2]"
                onPlay={handlePlay}
                onPlaying={handleVideoPlaying}
                onPause={handleVideoPause}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onCanPlay={handleCanPlay}
                onLoadedData={handleLoadedData}
                onWaiting={handleWaiting}
                onStalled={handleStalled}
                onError={handleVideoError}
                playsInline
                // @ts-ignore — legacy WebKit attribute for iPad WebView
                webkit-playsinline=""
                crossOrigin="anonymous"
                controlsList="nodownload"
              />

              {/* Loading spinner */}
              {videoState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                </div>
              )}

              {/* Autoplay blocked overlay */}
              {videoState === 'autoplay-blocked' && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <button
                    onClick={handleManualPlay}
                    className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110"
                  >
                    <Play className="w-10 h-10 text-white fill-white ml-1" />
                  </button>
                </div>
              )}

              {/* Error / Stalled overlay */}
              {(videoState === 'error' || videoState === 'stalled') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3">
                  <button
                    onClick={handleRetry}
                    className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all hover:scale-110"
                  >
                    <RotateCcw className="h-8 w-8 text-white" />
                  </button>
                  <span className="text-white text-sm font-medium drop-shadow-lg">
                    {videoState === 'error' ? 'Failed to load — tap to retry' : 'Buffering — tap to retry'}
                  </span>
                </div>
              )}

              {/* Custom controls overlay */}
              {videoState !== 'autoplay-blocked' && videoState !== 'error' && videoState !== 'stalled' && (
              <div 
                className={`absolute inset-0 transition-opacity duration-300 z-10 ${
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
                      setShowComments(true);
                    }}
                    aria-label={t('mediaHub.comments.title')}
                    className="relative w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <MessageCircle className="w-5 h-5 text-white" />
                    {!!video.commentsCount && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                        {video.commentsCount}
                      </span>
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
              )}

              {/* Gradient progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-10">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, rgb(139, 92, 246), rgb(56, 189, 248))'
                  }}
                />
              </div>

              {/* Title overlay when paused */}
              {!isPlaying && videoState !== 'autoplay-blocked' && videoState !== 'error' && videoState !== 'stalled' && (
                <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/70 to-transparent z-10">
                  <h3 className="text-white text-xl font-semibold">{video.title}</h3>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        <ShortCommentsSheet
          open={showComments}
          onOpenChange={setShowComments}
          videoId={video.id}
          videoTitle={video.title}
        />
      </DialogContent>
    </Dialog>
  );
};
