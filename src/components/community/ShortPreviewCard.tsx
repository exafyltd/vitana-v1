import { useEffect, useRef, useState } from 'react';
import { Play, Trash2, User, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KebabMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu-kebab';
import { useShortHoverPreview } from '@/hooks/useShortHoverPreview';
import { ImageWithFallback } from '@/components/diary/ImageWithFallback';
import { t } from '@/lib/i18n-toast';

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
    creatorAvatar?: string | null;
    creatorDisplayName?: string | null;
    description?: string;
  };
  index: number;
  currentUserId?: string;
  onClick: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function ShortPreviewCard({
  video,
  index,
  currentUserId,
  onClick,
  onDelete,
  onEdit,
}: ShortPreviewCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
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

  const showOwnerMenu = currentUserId && video.user_id === currentUserId;

  // Get the best available thumbnail URL
  const thumbnailUrl = video.thumbnail_url || video.thumbnailImage;

  return (
    <div
      ref={containerRef}
      style={{
        animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s backwards`,
      }}
      className="group relative w-full max-w-[260px] mx-auto"
      {...handlers}
      tabIndex={0}
      role="button"
      aria-label={`Play ${video.title}`}
    >
      {/* Owner Menu (Edit & Delete) */}
      {showOwnerMenu && (onEdit || onDelete) && (
        <div
          className="absolute top-3 right-3 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <KebabMenu>
            {onEdit && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('screens.community.editDetails')}
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
                {t('screens.community.delete')}
              </DropdownMenuItem>
            )}
          </KebabMenu>
        </div>
      )}

      <div className="cursor-pointer" onClick={onClick}>
        {/* Thumbnail Container - Fixed 9:16 aspect ratio with max height */}
        <div
          className={`relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-muted transition-all duration-300 ${
            isHovering && !disabled
              ? '-translate-y-1 shadow-lg ring-4 ring-violet-500/10'
              : 'shadow-sm hover:shadow-md hover:-translate-y-1 hover:ring-4 hover:ring-violet-500/10'
          }`}
        >
          {/* Fallback gradient if no thumbnail */}
          {!thumbnailUrl && (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-pink-500/20" />
          )}

          {/* Video Element (hidden until preview starts) */}
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
              isPreviewing && !loadError ? 'opacity-100' : 'opacity-0'
            }`}
            poster={thumbnailUrl}
            preload="metadata"
            muted
            playsInline
            loop
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
          />

          {/* Thumbnail Image with fallback handling */}
          {thumbnailUrl && (
            <ImageWithFallback
              src={thumbnailUrl}
              alt={video.title}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
                isPreviewing && !loadError ? 'opacity-0' : 'opacity-100'
              }`}
            />
          )}

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
                {t('screens.community.live2')}
              </Badge>
            </div>
          )}

          {/* Duration Badge - Bottom Right (outside overflow) */}
          <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
            <span 
              className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium backdrop-blur-sm"
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
            className="font-semibold text-foreground leading-snug line-clamp-2"
            style={{ fontSize: `calc(0.875rem * var(--font-scale, 1))` }}
          >
            {video.title}
          </h3>
          
          {/* Uploader info */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={video.creatorAvatar || undefined} alt={video.creator} />
              <AvatarFallback className="text-xs bg-muted">
                {video.creatorDisplayName?.[0] || video.creator[0] || <User className="w-3 h-3" />}
              </AvatarFallback>
            </Avatar>
            <p 
              className="text-muted-foreground flex-1 truncate"
              style={{ fontSize: `calc(0.75rem * var(--font-scale, 1))` }}
            >
              {video.creator}
            </p>
          </div>

          {/* Tag Pills */}
          {video.tags?.length > 0 && (
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
