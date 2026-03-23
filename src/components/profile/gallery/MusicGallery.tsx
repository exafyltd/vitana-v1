import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Play, Pause, Music } from "lucide-react";
import { MusicUploadDialog } from "./MusicUploadDialog";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useTranslation } from "@/hooks/useTranslation";
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

interface MusicGalleryProps {
  userId?: string;
}

export function MusicGallery({ userId }: MusicGalleryProps) {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;
  const isOwner = user?.id === targetUserId;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { uploadMedia, isUploading, progress } = useMediaUpload();
  const { currentMedia, isPlaying, playMedia, togglePlay } = useAudioPlayer();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["profile-music", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from("media_uploads")
        .select("*, music_metadata(*)")
        .eq("user_id", targetUserId)
        .eq("media_type", "music")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const deleteTrack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_uploads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile-music", targetUserId] }),
  });

  const handleUpload = async (data: { file: File; title: string; description?: string; genre?: string; isPublic: boolean }) => {
    const result = await uploadMedia(data.file, {
      title: data.title,
      description: data.description || "",
      mediaType: "music",
      tags: [],
      visibility: data.isPublic ? "public" : "private",
      genre: data.genre,
    });
    if (result) {
      queryClient.invalidateQueries({ queryKey: ["profile-music", targetUserId] });
      setUploadOpen(false);
    }
  };

  const handlePlay = (track: any) => {
    const mediaData = {
      id: track.id,
      title: track.title || "Untitled",
      creator: "",
      audioUrl: track.file_url,
      duration: track.duration || 0,
      mediaType: "music" as const,
    };

    if (currentMedia?.id === track.id) {
      togglePlay();
    } else {
      playMedia(mediaData);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (tracks.length === 0 && !isOwner) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">🎵</span>
          {translate("gallery.music", "Music Gallery")}
        </h3>
        {isOwner && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {translate("gallery.uploadMusic", "Upload Music")}
          </Button>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl bg-muted/30">
          <Music className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {translate("gallery.noMusic", "No music yet")}
          </p>
          {isOwner && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {translate("gallery.addFirstTrack", "Add your first track")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track) => {
            const isActive = currentMedia?.id === track.id;
            const isTrackPlaying = isActive && isPlaying;
            const meta = Array.isArray(track.music_metadata) ? track.music_metadata[0] : track.music_metadata;

            return (
              <div
                key={track.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
                  onClick={() => handlePlay(track)}
                >
                  {isTrackPlaying ? (
                    <Pause className="h-4 w-4 text-primary" />
                  ) : (
                    <Play className="h-4 w-4 text-primary ml-0.5" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.title || "Untitled"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {meta?.genre && <span>{meta.genre}</span>}
                    {track.duration && <span>{formatDuration(track.duration)}</span>}
                  </div>
                </div>

                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(track.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MusicUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
        isUploading={isUploading}
        progress={progress}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("gallery.deleteTitle", "Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("gallery.deleteMusicDescription", "This track will be permanently deleted. This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translate("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteTrack.mutate(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {translate("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
