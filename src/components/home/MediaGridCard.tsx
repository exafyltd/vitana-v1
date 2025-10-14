import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Music, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useNavigate } from "react-router-dom";

interface MediaGridCardProps {
  media: any;
  className?: string;
}

export function MediaGridCard({ media, className }: MediaGridCardProps) {
  const { currentMedia, isPlaying, playMedia, togglePlay } = useAudioPlayer();
  const navigate = useNavigate();

  const isCurrentMedia = currentMedia?.id === media.id;
  const isThisPlaying = isCurrentMedia && isPlaying;

  const getMediaIcon = () => {
    switch (media.media_type) {
      case 'Music': return Music;
      case 'Podcast': return Mic;
      case 'Video': return Video;
      default: return Music;
    }
  };

  const getGradientClass = () => {
    switch (media.media_type) {
      case 'Music': return 'from-purple-500/10 via-pink-500/10 to-purple-500/10';
      case 'Podcast': return 'from-blue-500/10 via-teal-500/10 to-blue-500/10';
      case 'Video': return 'from-red-500/10 via-orange-500/10 to-red-500/10';
      default: return 'from-purple-500/10 via-pink-500/10 to-purple-500/10';
    }
  };

  const getBorderClass = () => {
    switch (media.media_type) {
      case 'Music': return 'border-purple-400/50 hover:border-purple-400';
      case 'Podcast': return 'border-blue-400/50 hover:border-blue-400';
      case 'Video': return 'border-red-400/50 hover:border-red-400';
      default: return 'border-purple-400/50 hover:border-purple-400';
    }
  };

  const getCreator = () => {
    const musicMeta = Array.isArray(media.music_metadata) ? media.music_metadata[0] : media.music_metadata;
    const podcastMeta = Array.isArray(media.podcast_metadata) ? media.podcast_metadata[0] : media.podcast_metadata;
    
    if (media.media_type === 'Music' && musicMeta?.artist_name) {
      return musicMeta.artist_name;
    }
    if (media.media_type === 'Podcast' && podcastMeta?.host_name) {
      return podcastMeta.host_name;
    }
    return 'Unknown';
  };

  const handlePlay = () => {
    if (media.media_type === 'Video') {
      navigate(`/comm/media-hub?tab=videos&id=${media.id}`);
      return;
    }

    if (isCurrentMedia) {
      togglePlay();
    } else {
      const musicMeta = Array.isArray(media.music_metadata) ? media.music_metadata[0] : media.music_metadata;
      const podcastMeta = Array.isArray(media.podcast_metadata) ? media.podcast_metadata[0] : media.podcast_metadata;
      
      playMedia({
        id: media.id,
        title: media.title,
        creator: getCreator(),
        audioUrl: media.file_url,
        duration: musicMeta?.duration || podcastMeta?.duration || 0,
        imageUrl: media.thumbnail_url,
        mediaType: media.media_type === 'Music' ? 'music' : 'podcast'
      });
    }
  };

  const Icon = getMediaIcon();

  return (
    <Card className={`relative overflow-hidden border-2 ${getBorderClass()} transition-all group ${className}`}>
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradientClass()} -z-10`} />
      
      {/* Watermark icon */}
      <Icon className="absolute top-2 right-2 w-8 h-8 text-muted-foreground/20" />

      <CardContent className="p-4">
        {/* Badge */}
        <Badge variant="secondary" className="mb-3">
          {media.media_type}
        </Badge>

        {/* Thumbnail */}
        <div className="relative mb-3 rounded-lg overflow-hidden bg-muted aspect-video">
          {media.thumbnail_url ? (
            <img 
              src={media.thumbnail_url} 
              alt={media.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="w-12 h-12 text-muted-foreground/40" />
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
            <Button
              size="icon"
              variant="secondary"
              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
              onClick={handlePlay}
            >
              {isThisPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>
          </div>

          {/* Active playing indicator */}
          {isThisPlaying && (
            <div className="absolute bottom-2 left-2 flex gap-1 items-end">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-white animate-pulse rounded-full"
                  style={{
                    height: `${Math.random() * 12 + 6}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Title and creator */}
        <h3 className="font-semibold text-sm line-clamp-2 mb-1" title={media.title}>
          {media.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {getCreator()}
        </p>

        {/* Tags */}
        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {media.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
