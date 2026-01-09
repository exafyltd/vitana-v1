import { useRef, useEffect, useState, useCallback } from 'react';
import { MobileShortSlide } from './MobileShortSlide';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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

  // Handle like
  const handleLike = useCallback((videoId: string) => {
    setLikedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  }, []);

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
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
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
      className="fixed inset-0 bg-black z-50 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{
        scrollSnapType: 'y mandatory',
        overscrollBehavior: 'contain',
      }}
    >
      {shorts.map((video, index) => (
        <MobileShortSlide
          key={video.id || index}
          video={video}
          isActive={index === activeIndex}
          onLike={() => video.id && handleLike(video.id)}
          onShare={() => handleShare(video)}
          onBack={onClose}
          isLiked={video.id ? likedVideos.has(video.id) : false}
        />
      ))}

      {/* Progress indicator */}
      <div className="fixed top-16 left-0 right-0 flex justify-center gap-1 z-20 pointer-events-none">
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
