import { Music, Play, Pause, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail_url?: string;
  file_url: string;
  tags?: string[];
}

interface MusicListCardProps {
  tracks: Track[];
  title?: string;
  className?: string;
}

export function MusicListCard({ tracks, title = "Recommended Music", className }: MusicListCardProps) {
  const { playMedia, currentMedia, isPlaying, pause } = useAudioPlayer();
  const navigate = useNavigate();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayTrack = (track: Track) => {
    // If same track is playing, toggle play/pause
    if (currentMedia?.id === track.id && isPlaying) {
      pause();
    } else {
      playMedia({
        id: track.id,
        title: track.title,
        creator: track.artist,
        audioUrl: track.file_url,
        duration: track.duration,
        imageUrl: track.thumbnail_url,
        mediaType: 'music'
      });
    }
  };

  const isTrackPlaying = (trackId: string) => {
    return currentMedia?.id === trackId && isPlaying;
  };

  if (!tracks || tracks.length === 0) {
    return (
      <Card className={cn(
        "relative overflow-hidden border-2 border-purple-400/30 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/10",
        className
      )}>
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <Music className="w-12 h-12 text-purple-400/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
            No music available yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
            Upload music to see personalized recommendations here
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/comm/media-hub?tab=music')}
            className="border-purple-400/50 hover:border-purple-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Music
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 border-purple-400/50 hover:border-purple-400 transition-all group",
      className
    )}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 -z-10" />
      
      {/* Music note watermark */}
      <Music className="absolute top-4 right-4 w-16 h-16 text-purple-400/10" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-500" />
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/comm/media-hub?tab=music')}
            className="text-xs hover:text-purple-600"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 pb-4">
        {tracks.slice(0, 5).map((track) => {
          const isCurrentlyPlaying = isTrackPlaying(track.id);
          
          return (
            <div
              key={track.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50/50 transition-all group/track",
                isCurrentlyPlaying && "bg-purple-100/70"
              )}
            >
              {/* Thumbnail or music icon */}
              <div className="relative flex-shrink-0">
                {track.thumbnail_url ? (
                  <img
                    src={track.thumbnail_url}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-400/20 flex items-center justify-center">
                    <Music className="w-6 h-6 text-purple-500" />
                  </div>
                )}
                
                {/* Animated equalizer overlay when playing */}
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
              
              {/* Track info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate text-foreground">
                  {track.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {track.artist}
                </p>
              </div>
              
              {/* Duration */}
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDuration(track.duration)}
              </span>
              
              {/* Play/Pause button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePlayTrack(track)}
                className={cn(
                  "rounded-full w-8 h-8 p-0 opacity-0 group-hover/track:opacity-100 transition-opacity hover:bg-purple-400/20",
                  isCurrentlyPlaying && "opacity-100 bg-purple-400/20"
                )}
              >
                {isCurrentlyPlaying ? (
                  <Pause className="w-4 h-4 text-purple-600" />
                ) : (
                  <Play className="w-4 h-4 text-purple-600" />
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
