import { Radio, Play, Pause, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface Episode {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail_url?: string;
  file_url: string;
  tags?: string[];
}

interface PodcastListCardProps {
  episodes: Episode[];
  title?: string;
  className?: string;
}

export function PodcastListCard({ episodes, title = "Recommended Podcasts", className }: PodcastListCardProps) {
  const { playMedia, currentMedia, isPlaying, pause } = useAudioPlayer();
  const navigate = useNavigate();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayEpisode = (episode: Episode) => {
    // If same episode is playing, toggle play/pause
    if (currentMedia?.id === episode.id && isPlaying) {
      pause();
    } else {
      playMedia({
        id: episode.id,
        title: episode.title,
        creator: episode.artist,
        audioUrl: episode.file_url,
        duration: episode.duration,
        imageUrl: episode.thumbnail_url,
        mediaType: 'podcast'
      });
    }
  };

  const isEpisodePlaying = (episodeId: string) => {
    return currentMedia?.id === episodeId && isPlaying;
  };

  if (!episodes || episodes.length === 0) {
    return (
      <Card className={cn(
        "relative overflow-hidden border-2 border-status-warning/25 bg-gradient-to-br from-status-warning/5 via-status-warning/5 to-status-warning/10",
        className
      )}>
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <Radio className="w-12 h-12 text-status-warning/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
            {t('screens.home.noPodcastsAvailableYet')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
            {t('screens.home.uploadPodcastsSeePersonalizedRecommendationsHere')}
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/comm/media-hub?tab=podcasts')}
            className="border-status-warning/40 hover:border-status-warning/80"
          >
            <Plus className="w-4 h-4 me-2" />
            {t('screens.home.uploadPodcast')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 border-status-warning/40 hover:border-status-warning/80 transition-all group",
      className
    )}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-status-warning/10 via-status-warning/10 to-status-warning/10 -z-10" />
      
      {/* Radio icon watermark */}
      <Radio className="absolute top-4 end-4 w-16 h-16 text-status-warning/10 pointer-events-none z-0" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Radio className="w-5 h-5 text-status-warning" />
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/comm/media-hub?tab=podcasts')}
            className="text-xs hover:text-status-warning px-4 py-2 min-h-10 cursor-pointer"
          >{t('screens.home.viewAll')}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-1 pb-4">
        {episodes.slice(0, 5).map((episode) => {
          const isCurrentlyPlaying = isEpisodePlaying(episode.id);
          
          return (
            <div
              key={episode.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group/episode border-b border-border/30 last:border-b-0",
                "bg-gradient-to-r from-status-warning/5 to-transparent",
                "hover:from-status-warning/10 hover:to-status-warning/5",
                "hover:shadow-sm hover:shadow-status-warning/10 hover:scale-[1.01]",
                isCurrentlyPlaying && "from-status-warning/10 to-status-warning/5 shadow-sm"
              )}
            >
              {/* Thumbnail or radio icon */}
              <div className="relative flex-shrink-0">
                {episode.thumbnail_url ? (
                  <img
                    src={episode.thumbnail_url}
                    alt={episode.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-status-warning/15 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-status-warning" />
                  </div>
                )}
                
                {/* Animated sound waves overlay when playing */}
                {isCurrentlyPlaying && (
                  // design-allow-next-line: on-media scrim, theme-independent
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-card animate-pulse rounded-full"
                          style={{
                            height: `${8 + Math.random() * 8}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: `${0.6 + Math.random() * 0.4}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Episode info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate text-foreground leading-snug">
                  {episode.title}
                </h4>
                <p className="text-xs text-muted-foreground/70 truncate font-light">
                  {episode.artist}
                </p>
              </div>
              
              {/* Duration */}
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDuration(episode.duration)}
              </span>
              
              {/* Play/Pause button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePlayEpisode(episode)}
                className={cn(
                  "rounded-full w-9 h-9 p-0 transition-all duration-300 flex-shrink-0",
                  "opacity-0 group-hover/episode:opacity-100",
                  "hover:bg-status-warning/15 hover:scale-110 hover:shadow-md hover:shadow-status-warning/20",
                  isCurrentlyPlaying && "opacity-100 bg-status-warning/10 shadow-sm"
                )}
              >
                {isCurrentlyPlaying ? (
                  <Pause className="w-4 h-4 text-status-warning" />
                ) : (
                  <Play className="w-4 h-4 text-status-warning" />
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
