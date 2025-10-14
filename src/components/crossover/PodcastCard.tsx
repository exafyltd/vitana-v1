import { Play, Pause, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageFlag } from "@/components/ui/language-flag";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { usePodcastFavorite } from "@/hooks/usePodcastFavorite";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isThisWeek, isThisYear } from "date-fns";
import { useAuth } from "@/context/AuthProvider";

interface PodcastCardProps {
  id: string;
  title: string;
  creator: string;
  duration?: number;
  uploadedAt: string;
  description?: string;
  language: string;
  audioUrl: string;
  imageUrl?: string;
}

export function PodcastCard({
  id,
  title,
  creator,
  duration,
  uploadedAt,
  description,
  language,
  audioUrl,
  imageUrl,
}: PodcastCardProps) {
  const { currentPodcast, isPlaying, playPodcast, togglePlay } = useAudioPlayer();
  const { user } = useAuth();
  const { isFavorited, toggleFavorite, isToggling } = usePodcastFavorite(id, user?.id);
  const { toast } = useToast();

  const isThisPodcastPlaying = currentPodcast?.id === id && isPlaying;

  const handlePlayToggle = () => {
    if (currentPodcast?.id === id) {
      togglePlay();
    } else {
      playPodcast({
        id,
        title,
        host: creator,
        audioUrl,
        duration: duration || 0,
        imageUrl,
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: title,
      text: description || `Listen to ${title} on Vitana`,
      url: `${window.location.origin}/comm/media-hub?podcast=${id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareData.url);
      toast({
        title: "Link copied",
        description: "Podcast link copied to clipboard",
        duration: 2000,
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today at ${format(date, "HH:mm")}`;
    }
    if (isThisWeek(date)) {
      return format(date, "EEEE 'at' HH:mm");
    }
    if (isThisYear(date)) {
      return format(date, "MMM dd");
    }
    return format(date, "MMM dd, yyyy");
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      className={`
        group relative rounded-2xl border bg-card p-6 shadow-sm
        transition-all duration-300
        hover:bg-card/95 hover:-translate-y-1 hover:shadow-lg
        hover:shadow-primary/15
        ${isThisPodcastPlaying ? "border-l-4 border-l-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/40"}
      `}
    >
      {/* Header: Title + Language Flag */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-bold text-foreground leading-tight flex-1 min-w-0">
          {title}
        </h3>
        <div className="flex-shrink-0">
          <LanguageFlag languageCode={language} className="w-8 h-8" />
        </div>
      </div>

      {/* Metadata: Creator • Duration • Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
        <span>{creator}</span>
        {duration && (
          <>
            <span>•</span>
            <span>{formatDuration(duration)}</span>
          </>
        )}
        <span>•</span>
        <span>{formatDate(uploadedAt)}</span>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground line-clamp-1 mb-4">
          {description}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="default"
          onClick={handlePlayToggle}
          className="h-9 px-4 gap-2"
        >
          {isThisPodcastPlaying ? (
            <>
              <Pause className="h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Play
            </>
          )}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => toggleFavorite()}
          disabled={isToggling || !user}
          className="h-9 w-9"
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              isFavorited ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleShare}
          className="h-9 w-9"
        >
          <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary" />
        </Button>
      </div>
    </div>
  );
}
