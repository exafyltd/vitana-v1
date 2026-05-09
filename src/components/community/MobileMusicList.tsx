import { Play, Pause, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useBookmarks } from '@/hooks/useBookmarks';
import { notify, t } from '@/lib/i18n-toast';

interface MusicTrack {
  id: string;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  file_url: string;
  duration?: number | null;
  plays_count?: number | null;
  created_at?: string;
  music_metadata?: Array<{
    genre?: string;
    mood?: string;
    artist_name?: string;
  }> | {
    genre?: string;
    mood?: string;
    artist_name?: string;
  };
}

interface MobileMusicListProps {
  tracks: MusicTrack[];
}

export function MobileMusicList({ tracks }: MobileMusicListProps) {
  const { playMedia, currentMedia, isPlaying, pause } = useAudioPlayer();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = (track: MusicTrack) => {
    if (currentMedia?.id === track.id && isPlaying) {
      pause();
    } else {
      playMedia({
        id: track.id,
        title: track.title,
        creator: track.music_metadata?.[0]?.artist_name || 'Unknown Artist',
        audioUrl: track.file_url,
        duration: track.duration || 0,
        mediaType: 'music'
      });
    }
  };

  const handleShare = async (track: MusicTrack) => {
    const shareData = {
      title: track.title,
      text: `Check out "${track.title}" by ${track.music_metadata?.[0]?.artist_name || 'Unknown Artist'} on Vitana`,
      url: `${window.location.origin}/comm/media-hub?tab=music&track=${track.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      notify('toasts.community.linkCopied', 'toasts.community.musicLinkCopiedClipboard');
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Play className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{t('screens.community.noMusicUploadedYet')}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">{t('screens.community.firstShare')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-24">
      {tracks.map((track, index) => {
        const isCurrentlyPlaying = currentMedia?.id === track.id && isPlaying;
        const metadata = Array.isArray(track.music_metadata) 
          ? track.music_metadata[0] 
          : track.music_metadata;
        const artistName = metadata?.artist_name || 'Unknown Artist';
        const genre = metadata?.genre;

        return (
          <div
            key={track.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              isCurrentlyPlaying
                ? 'bg-primary/10 border border-primary/20'
                : 'bg-card/60 border border-border/50'
            }`}
            style={{
              animation: `fadeSlideIn 0.3s ease-out ${index * 0.05}s backwards`
            }}
          >
            {/* Play button */}
            <Button
              size="icon"
              variant={isCurrentlyPlaying ? "default" : "secondary"}
              onClick={() => handlePlay(track)}
              className="h-12 w-12 rounded-full shrink-0"
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{track.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{artistName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground/70">
                  {formatDuration(track.duration)}
                </span>
                {genre && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-xs text-muted-foreground/70">{genre}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await toggleBookmark({
                    item_type: 'music',
                    item_id: track.id,
                    item_name: track.title,
                    item_metadata: {
                      artist: artistName,
                      duration: track.duration,
                      genre: genre,
                      file_url: track.file_url,
                      tags: track.tags || []
                    }
                  });
                }}
                className="h-9 w-9 rounded-full"
              >
                <Heart
                  className={`h-4 w-4 ${
                    isBookmarked('music', track.id)
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleShare(track)}
                className="h-9 w-9 rounded-full"
              >
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
