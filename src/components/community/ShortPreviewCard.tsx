import { useEffect, useRef, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { KebabMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu-kebab';
import { useShortHoverPreview } from '@/hooks/useShortHoverPreview';

interface ShortPreviewCardProps {
  video: {
    id: string;
    title: string;
    creator: string;
    duration: string;
    thumbnailImage: string;
    src_url: string;
    thumbnail_url?: string;
    user_id?: string;
    tags?: string[];
    isLive?: boolean;
  };
  index: number;
  currentUserId?: string;
  onClick: () => void;
  onDelete?: () => void;
}

export function ShortPreviewCard({
  video,
  index,
  currentUserId,
  onClick,
  onDelete,
}: ShortPreviewCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    videoRef,
    isHovering,
    isPreviewing,
    previewProgress,
    loadError,
    handlers,
    disabled,
  } = useShortHoverPreview({
    videoUrl: video.src_url,
    isVisible,
  });

  // Tag color mapping
  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('nutrition') || tagLower.includes('recipe')) {
      return 'from-orange-400/20 to-orange-500/10 text-orange-700 border-orange-300/30';
    }
    if (tagLower.includes('wellness') || tagLower.includes('mindful')) {
      return 'from-violet-400/20 to-violet-500/10 text-violet-700 border-violet-300/30';
    }
    if (tagLower.includes('fitness') || tagLower.includes('yoga')) {
      return 'from-emerald-400/20 to-emerald-500/10 text-emerald-700 border-emerald-300/30';
    }
    if (tagLower.includes('health')) {
      return 'from-blue-400/20 to-blue-500/10 text-blue-700 border-blue-300/30';
    }
    return 'from-violet-400/20 to-violet-500/10 text-violet-700 border-violet-300/30';
  };

  // IntersectionObserver to track visibility (60% threshold)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.intersectionRatio >= 0.6);
        });
      },
      { threshold: [0, 0.6, 1] }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const showDeleteMenu = currentUserId && video.user_id === currentUserId;

  return (
    <div
      ref={containerRef}
      style={{
        animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s backwards`,
      }}
      className="group relative"
      {...handlers}
      tabIndex={0}
      role="button"
      aria-label={`Play ${video.title}`}
    >
      {/* Delete Menu (only for video owner) */}
      {showDeleteMenu && onDelete && (
        <div
          className="absolute top-3 right-3 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <KebabMenu>
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
          </KebabMenu>
        </div>
      )}

      <div className="cursor-pointer" onClick={onClick}>
        {/* Thumbnail Container */}
        <div
          className={`relative aspect-[9/16] rounded-2xl overflow-hidden transition-all duration-300 ${
            isHovering && !disabled
              ? '-translate-y-1 shadow-lg ring-4 ring-violet-500/10'
              : 'shadow-sm hover:shadow-md hover:-translate-y-1 hover:ring-4 hover:ring-violet-500/10'
          }`}
        >
          {/* Video Element (hidden until preview starts) */}
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPreviewing && !loadError ? 'opacity-100' : 'opacity-0'
            }`}
            playsInline
            muted
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
          />

          {/* Thumbnail Image */}
          <img
            src={video.thumbnailImage}
            alt={video.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPreviewing && !loadError ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>

          {/* Dark overlay fade-in before preview (prevents flash) */}
          {isHovering && !isPreviewing && (
            <div 
              className="absolute inset-0 bg-black/20 pointer-events-none"
              style={{
                animation: 'fadeIn 200ms ease-out forwards'
              }}
            />
          )}

          {/* Live Badge - Top Left */}
          {video.isLive && (
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full border-0 animate-pulse">
                • LIVE
              </Badge>
            </div>
          )}

          {/* Duration Badge - Bottom Right */}
          <div className="absolute bottom-2 right-2 z-10">
            <span 
              className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium backdrop-blur-sm"
            >
              {video.duration}
            </span>
          </div>

          {/* Play Button - Centered (fades out when preview starts) */}
          <div
            className={`absolute inset-0 bg-black/30 transition-all duration-300 flex items-center justify-center ${
              isPreviewing
                ? 'opacity-0 pointer-events-none'
                : isHovering
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-200 ${
                isHovering && !isPreviewing ? 'scale-110' : 'group-hover:scale-110'
              }`}
            >
              <Play className="w-8 h-8 text-violet-600 fill-violet-600 ml-1" />
            </div>
          </div>

          {/* Progress Bar - Bottom (only during preview) */}
          {isPreviewing && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 pointer-events-none">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-sky-400 transition-all duration-100"
                style={{ width: `${previewProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Content Below Thumbnail */}
        <div className="mt-3 space-y-2">
          <h3 
            className="font-semibold text-foreground leading-snug"
            style={{ fontSize: `calc(0.875rem * var(--font-scale, 1))` }}
          >
            {video.title}
          </h3>
          <p 
            className="text-muted-foreground"
            style={{ fontSize: `calc(0.75rem * var(--font-scale, 1))` }}
          >
            {video.creator}
          </p>

          {/* Tag Pills */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {video.tags.map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className={`bg-gradient-to-br px-2.5 py-0.5 rounded-full font-semibold border ${getTagColor(tag)}`}
                  style={{ fontSize: `calc(0.75rem * var(--font-scale, 1))` }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
