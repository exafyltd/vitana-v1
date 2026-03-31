import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { MobileShortSlide } from './MobileShortSlide';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useToggleLike } from '@/hooks/useShorts';

interface VideoShort {
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
}

interface MobileShortsFeedProps {
  shorts: VideoShort[];
  currentUserId?: string;
  onClose: () => void;
  initialIndex?: number;
}

export function MobileShortsFeed({
  shorts,
  currentUserId,
  onClose,
  initialIndex = 0,
}: MobileShortsFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [likeAdjustments, setLikeAdjustments] = useState<Map<string, number>>(new Map());
  const toggleLike = useToggleLike();

  // Signal that shorts overlay is open (hides ORB)
  useEffect(() => {
    document.body.dataset.shortsOpen = "true";
    return () => { delete document.body.dataset.shortsOpen; };
  }, []);

  // Android hardware back button support
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // Clear optimistic adjustments when fresh data arrives from server
  useEffect(() => {
    setLikeAdjustments(new Map());
  }, [shorts]);

  // Handle scroll snap detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const slideHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / slideHeight);
      
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < shorts.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, shorts.length]);

  // Scroll to initial index on mount
  useEffect(() => {
    if (containerRef.current && initialIndex > 0) {
      containerRef.current.scrollTop = initialIndex * window.innerHeight;
    }
  }, [initialIndex]);

  // Handle like with optimistic count update + DB persistence
  const handleLike = useCallback((videoId: string) => {
    setLikedVideos(prev => {
      const newSet = new Set(prev);
      const isLiking = !newSet.has(videoId);
      if (isLiking) {
        newSet.add(videoId);
      } else {
        newSet.delete(videoId);
      }

      // Update local count adjustment
      setLikeAdjustments(prevAdj => {
        const newMap = new Map(prevAdj);
        const current = newMap.get(videoId) || 0;
        newMap.set(videoId, isLiking ? current + 1 : current - 1);
        return newMap;
      });

      // Persist to DB
      toggleLike.mutate({ videoId, action: isLiking ? 'like' : 'unlike' });

      return newSet;
    });
  }, [toggleLike]);

  // Handle share
  const handleShare = useCallback(async (video: VideoShort) => {
    const shareData = {
      title: video.title,
      text: `Check out "${video.title}" by ${video.creator} on Vitana`,
      url: `${window.location.origin}/comm/media-hub?short=${video.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast({
        title: "Link copied",
        description: "Short link copied to clipboard",
        duration: 2000,
      });
    }
  }, []);

  if (shorts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading shorts...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-[60] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{
        scrollSnapType: 'y mandatory',
        overscrollBehavior: 'contain',
      }}
    >
      {shorts.map((video, index) => {
        const adjustedLikes = video.likes + (likeAdjustments.get(video.id || '') || 0);
        return (
          <MobileShortSlide
            key={video.id || index}
            video={{ ...video, likes: Math.max(0, adjustedLikes) }}
            isActive={index === activeIndex}
            onLike={() => video.id && handleLike(video.id)}
            onShare={() => handleShare(video)}
            onBack={onClose}
            isLiked={video.id ? likedVideos.has(video.id) : false}
          />
        );
      })}

      {/* Progress indicator */}
      <div className="fixed top-16 left-0 right-0 flex justify-center gap-1 z-[62] pointer-events-none">
        {shorts.length <= 10 && shorts.map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-all ${
              index === activeIndex
                ? 'w-6 bg-white'
                : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
