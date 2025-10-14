import { Play, Pause, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageFlag } from "@/components/ui/language-flag";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { usePodcastFavorite } from "@/hooks/usePodcastFavorite";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isThisWeek, isThisYear } from "date-fns";
import { useAuth } from "@/context/AuthProvider";
import { KebabMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu-kebab";

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
  isCreator?: boolean;
  onDelete?: () => void;
}

const getLanguageLabel = (languageCode: string): string => {
  const labels: Record<string, string> = {
    'en-US': 'English (US)',
    'en-GB': 'English (GB)',
    'de-DE': 'German',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'pt-PT': 'Portuguese',
    'ru-RU': 'Russian',
    'zh-CN': 'Chinese',
    'ar-XA': 'Arabic',
    'sr-RS': 'Serbian',
    'pl-PL': 'Polish',
  };
  return labels[languageCode] || 'Unknown';
};

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
  isCreator = false,
  onDelete,
}: PodcastCardProps) {
  const { currentMedia, isPlaying, playMedia, togglePlay } = useAudioPlayer();
  const { user } = useAuth();
  const { isFavorited, toggleFavorite, isToggling } = usePodcastFavorite(id, user?.id);
  const { toast } = useToast();

  const isThisPodcastPlaying = currentMedia?.id === id && isPlaying;

  const handlePlayToggle = () => {
    if (currentMedia?.id === id) {
      togglePlay();
    } else {
      playMedia({
        id,
        title,
        creator: creator,
        audioUrl,
        duration: duration || 0,
        imageUrl,
        mediaType: 'podcast'
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
        group relative rounded-2xl border shadow-sm p-4
        transition-all duration-300
        flex items-start gap-4
        hover:bg-accent/5 hover:-translate-y-1 hover:shadow-md
        ${isThisPodcastPlaying 
          ? "border-l-4 border-l-primary bg-accent/10" 
          : "border-border/30 hover:border-l-4 hover:border-l-primary/50"
        }
      `}
    >
      {/* Left: Play Button */}
      <div className="flex-shrink-0">
        <Button
          size="sm"
          onClick={handlePlayToggle}
          className="h-9 px-3 gap-2"
          aria-label={isThisPodcastPlaying ? "Pause episode" : "Play episode"}
        >
          {isThisPodcastPlaying ? (
            <>
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Pause</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Play</span>
            </>
          )}
        </Button>
      </div>

      {/* Center: Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title with optional equalizer */}
        <div className="flex items-center gap-2">
          {isThisPodcastPlaying && (
            <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full animate-pulse" aria-hidden="true" />
          )}
          <h3 className="text-base font-semibold text-foreground line-clamp-2 leading-tight">
            {title}
          </h3>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <span>by {creator}</span>
          {duration && (
            <>
              <span>·</span>
              <span>{formatDuration(duration)}</span>
            </>
          )}
          <span>·</span>
          <span>{formatDate(uploadedAt)}</span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {description}
          </p>
        )}
      </div>

      {/* Right: Flag + Actions */}
      <div className="flex-shrink-0 flex items-start gap-2">
        {/* Language Flag */}
        <LanguageFlag 
          languageCode={language} 
          className="w-6 h-6"
          aria-label={`Language: ${getLanguageLabel(language)}`}
        />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleFavorite()}
            disabled={isToggling || !user}
            className="h-8 w-8"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorited ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleShare}
            className="h-8 w-8"
            aria-label="Share episode"
          >
            <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Button>

          {/* Delete Menu - Only for creators */}
          {isCreator && onDelete && (
            <KebabMenu>
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={onDelete}
              >
                Delete Podcast
              </DropdownMenuItem>
            </KebabMenu>
          )}
        </div>
      </div>
    </div>
  );
}
