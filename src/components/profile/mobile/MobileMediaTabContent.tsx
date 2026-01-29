import { Play, Upload, Image as ImageIcon, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

interface MediaItem {
  id: string;
  thumbnail: string;
  type: 'video' | 'image' | 'audio';
  title?: string;
}

interface MobileMediaTabContentProps {
  media?: MediaItem[];
  className?: string;
}

// Placeholder media for demo
const PLACEHOLDER_MEDIA: MediaItem[] = [
  {
    id: '1',
    thumbnail: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=400',
    type: 'video',
    title: 'Morning Flow'
  },
  {
    id: '2',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
    type: 'image',
    title: 'Sunset Yoga'
  },
  {
    id: '3',
    thumbnail: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400',
    type: 'video',
    title: 'Breathwork'
  },
  {
    id: '4',
    thumbnail: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400',
    type: 'image',
    title: 'Evening Routine'
  },
  {
    id: '5',
    thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
    type: 'video',
    title: 'Mindful Movement'
  },
  {
    id: '6',
    thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    type: 'image',
    title: 'Wellness Session'
  }
];

export function MobileMediaTabContent({ 
  media = PLACEHOLDER_MEDIA,
  className 
}: MobileMediaTabContentProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const hasMedia = media.length > 0;
  const previewMedia = media.slice(0, 6);

  const handleViewAll = () => {
    navigate('/media');
  };

  const handleUpload = () => {
    // TODO: Open upload modal
    console.log('Open upload modal');
  };

  const handleThumbnailClick = (item: MediaItem) => {
    navigate(`/media/${item.id}`);
  };

  // Empty state
  if (!hasMedia) {
    return (
      <div className={cn("p-4", className)}>
        <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-primary/50" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-medium text-foreground">
              {translate('profileMedia.emptyTitle', 'No media yet')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {translate('profileMedia.emptyDescription', 'Share your wellness journey')}
            </p>
          </div>
          <Button 
            onClick={handleUpload}
            className="mt-2"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            {translate('profileMedia.uploadCta', 'Upload Media')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 space-y-4", className)}>
      {/* Preview Grid - 3 columns, 2 rows */}
      <div className="grid grid-cols-3 gap-1.5">
        {previewMedia.map((item) => (
          <button
            key={item.id}
            onClick={() => handleThumbnailClick(item)}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <img
              src={item.thumbnail}
              alt={item.title || translate('profileMedia.thumbnailAlt', 'Media')}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Video play indicator */}
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="h-4 w-4 text-foreground ml-0.5" />
                </div>
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
      </div>

      {/* View all CTA */}
      <button
        onClick={handleViewAll}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card/50 hover:bg-card/80 border border-border/50 transition-colors text-sm font-medium text-foreground"
      >
        {translate('profileMedia.viewAllCta', 'View all media')}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
