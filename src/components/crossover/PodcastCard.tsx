import { Play, Pause, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageFlag } from "@/components/ui/language-flag";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { usePodcastFavorite } from "@/hooks/usePodcastFavorite";
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isThisWeek, isThisYear } from "date-fns";
import { useAuth } from "@/context/AuthProvider";
import { KebabMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu-kebab";
import { notify, t } from '@/lib/i18n-toast';

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
      notify('toasts.crossover.linkCopied', 'toasts.crossover.podcastLinkCopiedClipboard');
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
        group relative rounded-2xl border-2 shadow-md p-5
        transition-all duration-300
        flex items-start gap-4
        bg-white/70 backdrop-blur-sm
        hover:shadow-xl hover:shadow-purple-100/40 hover:-translate-y-1 hover:border-purple-200/60
        ${isThisPodcastPlaying 
          ? "border-purple-300/70 bg-white/80 shadow-lg shadow-purple-100/30" 
          : "border-white/40 hover:border-purple-200/60"
        }
      `}
    >
      {/* Now Playing Accent Bar */}
      {isThisPodcastPlaying && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-l-2xl" />
      )}

      {/* Cover Image */}
      <div className="flex-shrink-0">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={`${title} cover`}
            className="w-16 h-16 rounded-lg object-cover shadow-md"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 shadow-md flex items-center justify-center">
            <Pause className="w-6 h-6 text-white/80" />
          </div>
        )}
      </div>

      {/* Center: Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title with Language Flag and Equalizer */}
        <div className="flex items-center gap-2">
          {isThisPodcastPlaying && (
            <div className="flex items-center gap-0.5 h-3 flex-shrink-0" aria-label={t('screens.crossover.nowPlaying')}>
              <div className="w-0.5 bg-purple-500 rounded-full" style={{ animation: 'equalizer 0.8s ease-in-out infinite', animationDelay: '0s' }}></div>
              <div className="w-0.5 bg-purple-500 rounded-full" style={{ animation: 'equalizer 0.8s ease-in-out infinite', animationDelay: '0.2s' }}></div>
              <div className="w-0.5 bg-purple-500 rounded-full" style={{ animation: 'equalizer 0.8s ease-in-out infinite', animationDelay: '0.4s' }}></div>
            </div>
          )}
          <h3 className="text-lg font-bold text-foreground line-clamp-1 leading-tight flex-1">
            {title}
          </h3>
          {language && (
            <LanguageFlag 
              languageCode={language} 
              className="w-5 h-5 flex-shrink-0"
              aria-label={`Language: ${getLanguageLabel(language)}`}
            />
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/75 truncate">
          <span className="font-medium">{creator}</span>
          {duration && (
            <>
              <span>•</span>
              <span>{formatDuration(duration)}</span>
            </>
          )}
        </div>

        {/* Description - clamped to 2 lines */}
        {description && (
          <p className="text-xs text-muted-foreground/75 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Right: Circular Play Button */}
      <div className="flex-shrink-0 flex items-center">
        <button
          onClick={handlePlayToggle}
          className={`
            relative w-12 h-12 rounded-full flex items-center justify-center
            bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md
            transition-all duration-300
            hover:shadow-lg hover:shadow-purple-400/50 hover:scale-105
            active:scale-95
            ${isThisPodcastPlaying ? 'animate-pulse-subtle' : ''}
          `}
          aria-label={isThisPodcastPlaying ? "Pause episode" : "Play episode"}
        >
          {isThisPodcastPlaying ? (
            <Pause className="h-5 w-5 fill-white" />
          ) : (
            <Play className="h-5 w-5 fill-white" />
          )}
          
          {/* Ripple effect on click */}
          <span className="absolute inset-0 rounded-full animate-ping opacity-0 group-active:opacity-75 bg-purple-400"></span>
        </button>
      </div>

      {/* Bottom Interaction Bar */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-3 pt-2 bg-gradient-to-t from-white/60 to-transparent backdrop-blur-sm rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleFavorite()}
            disabled={isToggling || !user}
            className="h-7 w-7 hover:bg-purple-50/80"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`h-3.5 w-3.5 transition-colors ${
                isFavorited ? "fill-pink-500 text-pink-500" : "text-muted-foreground/60 hover:text-pink-500"
              }`}
            />
          </Button>

          <div className="w-px h-4 bg-border/50"></div>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleShare}
            className="h-7 w-7 hover:bg-purple-50/80"
            aria-label={t('screens.crossover.shareEpisode')}
          >
            <Share2 className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-purple-500" />
          </Button>

          {isCreator && onDelete && (
            <>
              <div className="w-px h-4 bg-border/50"></div>
              <KebabMenu>
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={onDelete}
                >
                  {t('screens.crossover.deletePodcast')}
                </DropdownMenuItem>
              </KebabMenu>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
