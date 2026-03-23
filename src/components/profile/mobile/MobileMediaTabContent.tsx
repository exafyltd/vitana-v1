import { Play, ImageIcon, ChevronRight, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileGallery } from "@/hooks/useProfileGallery";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { Upload } from "lucide-react";
import { MusicGallery } from "@/components/profile/gallery/MusicGallery";

interface MobileMediaTabContentProps {
  userId?: string;
  className?: string;
}

export function MobileMediaTabContent({ 
  userId,
  className 
}: MobileMediaTabContentProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const { photos } = useProfileGallery(targetUserId);

  const { data: videos = [] } = useQuery({
    queryKey: ["profile-videos-preview", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from("media_uploads")
        .select("id, file_url, title, media_type, thumbnail_url")
        .eq("user_id", targetUserId)
        .eq("media_type", "video")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetUserId,
  });

  // Combine photos and videos into a unified preview list
  const mediaItems = [
    ...photos.map(p => ({ id: p.id, thumbnail: p.image_url, type: 'image' as const, title: p.caption })),
    ...videos.map(v => ({ id: v.id, thumbnail: v.thumbnail_url || v.file_url, type: 'video' as const, title: v.title })),
  ].slice(0, 6);

  const hasMedia = mediaItems.length > 0;

  const handleViewAll = () => {
    navigate('/media');
  };

  const handleUpload = () => {
    console.log('Open upload modal');
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
        {mediaItems.map((item) => (
          <button
            key={item.id}
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

      {/* Music Gallery */}
      <MusicGallery userId={userId} />
    </div>
  );
}
