import { Radio, Play, Pause, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
        "relative overflow-hidden border-2 border-orange-400/30 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-orange-500/10",
        className
      )}>
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <Radio className="w-12 h-12 text-orange-400/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
            No podcasts available yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
            Upload podcasts to see personalized recommendations here
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/comm/media-hub?tab=podcasts')}
            className="border-orange-400/50 hover:border-orange-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Podcast
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 border-orange-400/50 hover:border-orange-400 transition-all group",
      className
    )}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-orange-500/10 -z-10" />
      
      {/* Radio icon watermark */}
      <Radio className="absolute top-4 right-4 w-16 h-16 text-orange-400/10" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Radio className="w-5 h-5 text-orange-500" />
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/comm/media-hub?tab=podcasts')}
            className="text-xs hover:text-orange-600"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 pb-4">
        {episodes.slice(0, 5).map((episode) => {
          const isCurrentlyPlaying = isEpisodePlaying(episode.id);
          
          return (
            <div
              key={episode.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50/50 transition-all group/episode",
                isCurrentlyPlaying && "bg-orange-100/70"
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
                  <div className="w-12 h-12 rounded-lg bg-orange-400/20 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-orange-500" />
                  </div>
                )}
                
                {/* Animated sound waves overlay when playing */}
                {isCurrentlyPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-white animate-pulse rounded-full"
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
                <h4 className="font-medium text-sm truncate text-foreground">
                  {episode.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
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
                  "rounded-full w-8 h-8 p-0 opacity-0 group-hover/episode:opacity-100 transition-opacity hover:bg-orange-400/20",
                  isCurrentlyPlaying && "opacity-100 bg-orange-400/20"
                )}
              >
                {isCurrentlyPlaying ? (
                  <Pause className="w-4 h-4 text-orange-600" />
                ) : (
                  <Play className="w-4 h-4 text-orange-600" />
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
