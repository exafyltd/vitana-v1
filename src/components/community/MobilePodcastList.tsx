import { Play, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
interface PodcastEpisode {
  id: string;
  title: string;
  description?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  duration?: number | null;
  created_at?: string;
  user_id?: string;
  podcast_metadata?: Array<{
    host_name?: string;
    language?: string;
    show_name?: string;
  }> | {
    host_name?: string;
    language?: string;
    show_name?: string;
  };
}

interface MobilePodcastListProps {
  podcasts: PodcastEpisode[];
  currentUserId?: string;
}

export function MobilePodcastList({ podcasts, currentUserId }: MobilePodcastListProps) {
  const { playMedia, currentMedia, isPlaying, pause } = useAudioPlayer();

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMetadata = (podcast: PodcastEpisode) => {
    if (Array.isArray(podcast.podcast_metadata)) {
      return podcast.podcast_metadata[0];
    }
    return podcast.podcast_metadata;
  };

  const handlePlay = (podcast: PodcastEpisode) => {
    const metadata = getMetadata(podcast);
    
    if (currentMedia?.id === podcast.id && isPlaying) {
      pause();
    } else {
      playMedia({
        id: podcast.id,
        title: podcast.title,
        creator: metadata?.host_name || 'Unknown Host',
        audioUrl: podcast.file_url,
        duration: podcast.duration || 0,
        mediaType: 'podcast'
      });
    }
  };

  if (podcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{t('screens.community.noPodcastsUploadedYet')}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">{t('screens.community.firstShare')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-24">
      {podcasts.map((podcast, index) => {
        const metadata = getMetadata(podcast);
        const isCurrentlyPlaying = currentMedia?.id === podcast.id && isPlaying;
        const hostName = metadata?.host_name || 'Unknown Host';
        const showName = metadata?.show_name;

        return (
          <div
            key={podcast.id}
            className={`flex gap-3 p-3 rounded-xl transition-all ${
              isCurrentlyPlaying
                ? 'bg-primary/10 border border-primary/20'
                : 'bg-card/60 border border-border/50'
            }`}
            style={{
              animation: `fadeSlideIn 0.3s ease-out ${index * 0.05}s backwards`
            }}
          >
            {/* Thumbnail */}
            <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted">
              {podcast.thumbnail_url ? (
                <img
                  src={podcast.thumbnail_url}
                  alt={podcast.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary/50" />
                </div>
              )}
              
              {/* Play overlay */}
              <Button
                size="icon"
                variant="secondary"
                onClick={() => handlePlay(podcast)}
                className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-black/60 hover:bg-black/70 text-white"
              >
                {isCurrentlyPlaying ? (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-4 bg-white rounded-full animate-pulse" />
                    <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                {podcast.title}
              </h3>
              
              <div className="flex items-center gap-1.5 mt-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-muted">
                    {hostName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {hostName}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground/70">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(podcast.duration)}</span>
                </div>
                {podcast.created_at && (
                  <>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(podcast.created_at), { addSuffix: true })}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
