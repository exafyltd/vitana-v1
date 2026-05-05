import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Play, Video } from "lucide-react";
import { VideoUploadDialog } from "./VideoUploadDialog";
import { VideoLightbox } from "./VideoLightbox";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t } from '@/lib/i18n-toast';

interface VideoGalleryProps {
  userId?: string;
  compact?: boolean;
}

export function VideoGallery({ userId, compact }: VideoGalleryProps) {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;
  const isOwner = user?.id === targetUserId;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { uploadMedia, isUploading, progress } = useMediaUpload();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["profile-videos", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from("media_uploads")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("media_type", "video")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_uploads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile-videos", targetUserId] }),
  });

  const handleUpload = async (data: { file: File; title: string; description?: string; isPublic: boolean }) => {
    const result = await uploadMedia(data.file, {
      title: data.title,
      description: data.description || "",
      mediaType: "video",
      tags: [],
      visibility: data.isPublic ? "public" : "private",
    });
    if (result) {
      queryClient.invalidateQueries({ queryKey: ["profile-videos", targetUserId] });
      setUploadOpen(false);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const displayVideos = compact ? videos.slice(0, 6) : videos;

  if (videos.length === 0 && !isOwner) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">🎬</span>
          {translate("gallery.videos", "Video Gallery")}
        </h3>
        {isOwner && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {translate("gallery.uploadVideo", "Upload Video")}
          </Button>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl bg-muted/30">
          <Video className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {translate("gallery.noVideos", "No videos yet")}
          </p>
          {isOwner && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {translate("gallery.addFirstVideo", "Add your first video")}
            </Button>
          )}
        </div>
      ) : (
        <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
          {displayVideos.map((video, index) => (
            <div
              key={video.id}
              className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer bg-muted"
              onClick={() => setLightboxIndex(index)}
            >
              <video
                src={video.file_url}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
              />
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-foreground fill-current ml-0.5" />
                </div>
              </div>
              {/* Title & duration */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-xs text-white font-medium line-clamp-1">{video.title}</p>
                {video.duration && (
                  <p className="text-[10px] text-white/70">{formatDuration(video.duration)}</p>
                )}
              </div>
              {/* Delete */}
              {isOwner && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(video.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {compact && videos.length > 6 && (
        <p className="text-xs text-muted-foreground text-center">{t('screens.profile.value0MoreVideos', { value0: videos.length - 6 })}</p>
      )}

      <VideoUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
        isUploading={isUploading}
        progress={progress}
      />

      {lightboxIndex !== null && (
        <VideoLightbox
          videos={videos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate('gallery.deleteTitle', 'Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate('gallery.deleteVideoDescription', 'This video will be permanently deleted. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translate('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteVideo.mutate(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {translate('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
