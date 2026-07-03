import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { Button } from "@/components/ui/button";
import { RewardDot } from "@/components/ui/reward-dot";
import { Clock, MapPin, Users, Play, Headphones, Music, UserPlus, Calendar, PlayCircle, UserMinus, Loader2, Ticket, Eye } from "lucide-react";
import { useEventParticipation } from "@/hooks/useEventParticipation";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";
import { useMeetupSelection } from "@/context/MeetupSelectionContext";
import { getLocalizedEventCta, CtaConfig } from "@/lib/eventsCtaUtils";
import { TicketType } from "@/hooks/useEventTickets";
import { useTranslation } from "@/hooks/useTranslation";

interface NewsCardProps {
  title: string;
  /** Short line rendered in a smaller font directly under the title, e.g. "with Special Guests" */
  subtitle?: string;
  description?: string;
  imageUrl: string;
  fallbackImageUrl?: string;
  category?: "event" | "community" | "wellness" | "achievement" | "people" | "media" | "group";
  pillar?: string;
  icon?: React.ComponentType<any>;
  mediaType?: "video" | "podcast" | "music";
  author?: {
    name: string;
    avatar?: string;
  };
  authorId?: string;
  authorHandle?: string;
  isFollowing?: boolean;
  isFollowLoading?: boolean;
  location?: string;
  attendees?: number;
  timestamp?: string;
  /** Optional prominent relative date/time rendered at the BOTTOM of the card
   *  (Live Rooms), e.g. "Today 20.00h". Replaces the top timestamp chip there. */
  whenLabel?: string;
  price?: number | "free";
  currency?: string;
  className?: string;
  onClick?: () => void;
  actionButton?: React.ReactNode;
  utilityTopRight?: React.ReactNode;
  showSmartAction?: boolean;
  onActionClick?: () => void;
  rewardPoints?: number;
  rewardDescription?: string;
  showReward?: boolean;
  rewardPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  eventId?: string;
  eventType?: string;
  hasTickets?: boolean;
  isPaidEvent?: boolean;
  ticketTypes?: TicketType[];
  userHasTicket?: boolean;
  onBuyTicket?: () => void;
  onViewTicket?: () => void;
  "data-event-id"?: string;
}

const NewsCardBase = React.forwardRef<HTMLDivElement, NewsCardProps>(
  ({
    title,
    subtitle,
    description,
    imageUrl,
    fallbackImageUrl,
    category,
    pillar,
    icon: IconComponent,
    mediaType,
    author,
    authorId,
    authorHandle,
    isFollowing,
    isFollowLoading,
    location,
    attendees,
    timestamp,
    whenLabel,
    price,
    currency,
    className,
    onClick,
    actionButton,
    utilityTopRight,
    showSmartAction = false,
    onActionClick,
    rewardPoints,
    rewardDescription = "Earn credits",
    showReward = false,
    rewardPosition = "top-right",
    eventId,
    eventType,
    hasTickets,
    isPaidEvent,
    ticketTypes,
    userHasTicket,
    onBuyTicket,
    onViewTicket,
    "data-event-id": dataEventId
  }, ref) => {
    const { selectedMeetupId } = useMeetupSelection();
    const { translate } = useTranslation();
    const isSelected = category === 'event' && dataEventId ? selectedMeetupId === dataEventId : false;
    const [imageLoaded, setImageLoaded] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
    const [triedFallback, setTriedFallback] = useState(false);

    // Reset image state if imageUrl prop changes (e.g., different article)
    React.useEffect(() => {
      setCurrentImageUrl(imageUrl);
      setImageLoaded(false);
      setTriedFallback(false);
    }, [imageUrl]);

    const categoryStyles = {
      event: "bg-primary/20 text-primary border-primary/30",
      community: "bg-secondary/20 text-secondary-foreground border-secondary/30",
      wellness: "bg-accent/20 text-accent-foreground border-accent/30",
      achievement: "bg-muted/20 text-foreground border-muted/30"
    };

    const getMediaIcon = () => {
      switch (mediaType) {
        case "video": return Play;
        case "podcast": return Headphones;
        case "music": return Music;
        default: return null;
      }
    };

    const MediaIcon = getMediaIcon();

    // Build event details for calendar integration
    const eventDetailsForCalendar = eventId && title && timestamp ? {
      title,
      start_time: timestamp,
      location: location || '',
      description: description || '',
    } : undefined;

    const eventParticipation = useEventParticipation(
      eventId || '',
      attendees || 0,
      eventDetailsForCalendar
    );

    const displayAttendees = eventId ? eventParticipation.participantCount : attendees;

    // Use unified CTA logic for events
    const getSmartAction = () => {
      if (!showSmartAction) return null;

      let buttonText = "View";
      let buttonIcon = null;
      let buttonType: "join" | "follow" | "following" | "play" | "secondary" | "ticket" | "view-ticket" | "disabled" = "secondary";
      let isDisabled = false;
      let ctaAction: (() => void) | undefined = onActionClick;

      // Use unified localized CTA logic for event cards
      if (category === "event" && eventId) {
        const ctaConfig = getLocalizedEventCta({
          event: {
            id: eventId,
            event_type: eventType,
            metadata: {
              has_tickets: hasTickets,
              is_paid: isPaidEvent,
            }
          },
          ticketTypes: ticketTypes,
          userHasTicket: userHasTicket,
          isParticipating: eventParticipation?.isParticipating,
          context: 'card',
        }, translate);

        buttonText = ctaConfig.label;
        isDisabled = ctaConfig.disabled || false;

        // Map icon
        switch (ctaConfig.icon) {
          case 'ticket': buttonIcon = Ticket; break;
          case 'eye': buttonIcon = Eye; break;
          case 'user-plus': buttonIcon = UserPlus; break;
          case 'user-minus': buttonIcon = UserMinus; break;
          case 'calendar': buttonIcon = Calendar; break;
          default: buttonIcon = Calendar;
        }

        // Map variant
        switch (ctaConfig.variant) {
          case 'ticket': buttonType = 'ticket'; break;
          case 'view-ticket': buttonType = 'view-ticket'; break;
          case 'disabled': buttonType = 'disabled'; break;
          case 'join': buttonType = 'join'; break;
          default: buttonType = 'secondary';
        }

        // Map action
        switch (ctaConfig.action) {
          case 'buy-ticket':
          case 'get-free-ticket':
            ctaAction = onBuyTicket;
            break;
          case 'view-ticket':
            ctaAction = onViewTicket;
            break;
          case 'join':
          case 'leave':
          case 'reserve':
          case 'cancel':
            ctaAction = () => eventParticipation?.toggleParticipation();
            break;
          case 'sold-out':
            ctaAction = undefined;
            break;
        }
      } else {
        // Non-event cards - use original logic
        switch (category) {
          case "event":
          case "community":
            buttonText = "Join Now";
            buttonIcon = Calendar;
            buttonType = "join";
            break;
          case "people":
            if (isFollowing) {
              buttonText = "Following";
              buttonIcon = UserMinus;
              buttonType = "following";
            } else {
              buttonText = "Follow";
              buttonIcon = UserPlus;
              buttonType = "follow";
            }
            break;
          case "media":
            buttonText = mediaType === "video" ? "Watch Now" :
                        mediaType === "podcast" ? "Listen Now" :
                        mediaType === "music" ? "Play Now" : "View";
            buttonIcon = PlayCircle;
            buttonType = mediaType ? "play" : "secondary";
            break;
          case "group":
            buttonText = "Join Group";
            buttonIcon = Users;
            buttonType = "join";
            break;
          default:
            buttonText = "View";
            buttonType = "secondary";
        }
      }

      const ButtonIcon = buttonIcon;

      const getButtonClasses = () => {
        const baseClasses = "rounded-full font-bold text-white border-0 shadow-lg transition-all duration-300 hover:scale-105";

        switch (buttonType) {
          case "ticket":
            return `${baseClasses} bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/50 hover:shadow-2xl`;
          case "view-ticket":
            return `${baseClasses} bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-violet-500/50 hover:shadow-2xl`;
          case "disabled":
            return "rounded-full font-bold text-muted-foreground bg-muted border-0 shadow-sm cursor-not-allowed opacity-60";
          case "join":
            return `${baseClasses} bg-gradient-to-r from-gradient-join-start to-gradient-join-end hover:shadow-gradient-join-start/50 hover:shadow-2xl`;
          case "follow":
            return `${baseClasses} bg-gradient-to-r from-gradient-follow-start to-gradient-follow-end hover:shadow-gradient-follow-start/50 hover:shadow-2xl`;
          case "following":
            return `${baseClasses} bg-gradient-to-r from-gray-500 to-gray-600 hover:from-red-500 hover:to-red-600 hover:shadow-red-500/50`;
          case "play":
            return `${baseClasses} bg-gradient-to-r from-gradient-play-start to-gradient-play-end hover:shadow-gradient-play-start/50 hover:shadow-2xl`;
          case "secondary":
          default:
            return "rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm font-medium transition-all duration-300 hover:bg-white/20 hover:scale-105 shadow-lg";
        }
      };

      const isLoading = eventId ? (eventParticipation?.loading || eventParticipation?.checking) : (category === "people" ? isFollowLoading : false);

      // Product rule: never show a follow/unfollow CTA for someone you already
      // follow — opening a card must not risk an accidental unfollow. Matches
      // the shared <FollowButton> behaviour used on the detail screens.
      if (category === "people" && isFollowing) {
        return null;
      }

      return (
        <Button
          size="sm"
          className={getButtonClasses()}
          disabled={isLoading || isDisabled}
          onClick={(e) => {
            e.stopPropagation();
            if (ctaAction) {
              ctaAction();
            }
          }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            ButtonIcon && <ButtonIcon className="w-4 h-4" />
          )}
          {!isLoading && buttonText}
        </Button>
      );
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "group relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] border-0 h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-2xl",
          "shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
          isSelected && "ring-2 ring-primary ring-offset-2",
          className
        )}
        onClick={onClick}
        data-event-id={dataEventId}
        tabIndex={0}
        role="button"
        aria-label={`View ${title} details`}
        aria-selected={isSelected}
        onKeyDown={(e) => {
          // Handle Enter and Space keys for accessibility
          if ((e.key === 'Enter' || e.key === ' ') && onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* Reward Dot */}
        {showReward && rewardPoints && (
          <RewardDot
            points={rewardPoints}
            description={rewardDescription}
            position={rewardPosition}
            size="md"
          />
        )}

        <div className="relative h-full overflow-hidden rounded-[inherit]">
          {/* Background Image - placeholder gradient + lazy-loaded img */}
          <div
            className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.8) 50%, hsl(var(--muted) / 0.6) 100%)'
            }}
          >
            {currentImageUrl && (
              <img
                src={currentImageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  // Primary image failed to load (404, CORS, broken URL, etc.)
                  // Swap to fallback if we have one and haven't tried it yet.
                  if (fallbackImageUrl && !triedFallback && currentImageUrl !== fallbackImageUrl) {
                    setTriedFallback(true);
                    setCurrentImageUrl(fallbackImageUrl);
                    setImageLoaded(false);
                  }
                }}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
          </div>

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20 pointer-events-none" />

          {/* Media Play Icon Overlay */}
          {MediaIcon && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 border-2 border-white/30 group-hover:scale-110 transition-transform duration-300">
                <MediaIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          )}

          {/* Content Overlay */}
          <CardContent className="absolute inset-0 p-6 h-full flex flex-col text-white">
            {/* Top Section - Badges on left, Edit on right */}
            <div className="flex items-start w-full">
              {/* Left side - Category + Price + Timestamp (wraps naturally) */}
              <div className="flex flex-wrap gap-2 items-center flex-1 min-w-0">
                {/* Pillar badge with gradient accents */}
                {pillar && (
                  <div className={cn(
                    "text-xs text-white font-medium rounded-md px-2 py-1 backdrop-blur-sm border border-white/30 uppercase tracking-wide whitespace-nowrap",
                    pillar.toLowerCase().includes('movement') || pillar.toLowerCase().includes('exercise')
                      ? "bg-gradient-to-r from-orange-500/80 to-rose-500/80"
                      : pillar.toLowerCase().includes('mind') || pillar.toLowerCase().includes('mental')
                      ? "bg-gradient-to-r from-violet-500/80 to-sky-500/80"
                      : pillar.toLowerCase().includes('nutrition')
                      ? "bg-gradient-to-r from-emerald-500/80 to-lime-500/80"
                      : pillar.toLowerCase().includes('community')
                      ? "bg-gradient-to-r from-pink-500/80 to-violet-500/80"
                      : "bg-black/40"
                  )}>
                    {pillar}
                  </div>
                )}

                {/* Price badge */}
                {price !== undefined && (
                  <div className={cn(
                    "text-xs font-bold rounded-md px-2 py-1 backdrop-blur-sm border whitespace-nowrap",
                    price === "free"
                      ? "bg-green-500/90 text-white border-green-400/50"
                      : "bg-primary/90 text-primary-foreground border-primary/50"
                  )}>
                    {price === "free" ? "FREE" : `${currency === 'EUR' ? '€' : '$'}${price}`}
                  </div>
                )}

                {/* Timestamp */}
                {timestamp && (
                  <div className="flex items-center gap-1.5 text-xs text-white/90 bg-black/40 rounded-md px-2 py-1 backdrop-blur-sm">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium max-w-[140px] truncate">{timestamp}</span>
                  </div>
                )}
              </div>

              {/* Right side - Edit button pinned top-right */}
              {utilityTopRight && (
                <div className="flex-shrink-0 ml-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                  {utilityTopRight}
                </div>
              )}
            </div>

            {/* Main Content Area - takes up remaining space */}
            <div className="flex-1 flex flex-col justify-end space-y-3 pb-14">
              {/* Title */}
              <h3 className="text-lg font-bold leading-tight group-hover:text-primary-foreground transition-colors drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
                {title}
              </h3>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-xs text-white/80 font-medium -mt-2 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                  {subtitle}
                </p>
              )}

              {/* Description */}
              {description && (
                <p className="text-sm text-white/90 line-clamp-2 leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                  {description}
                </p>
              )}

              {/* Prominent relative date/time (Live Rooms) — e.g. "Today 20.00h" */}
              {whenLabel && (
                <div className="text-2xl font-bold text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
                  {whenLabel}
                </div>
              )}

              {/* Meta Information */}
              <div className="flex items-center justify-between pt-1">
                {/* Author */}
                {author && (
                  <div className="flex items-center gap-2.5">
                    <ClickableAvatar
                      userId={authorId}
                      handle={authorHandle}
                      src={author.avatar}
                      fallback={author.name.charAt(0)}
                      alt={author.name}
                      className="w-7 h-7 border-2 border-white/40"
                      disabled={authorId?.startsWith('demo-')}
                    />
                    <span className="text-xs text-white font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                      {author.name}
                    </span>
                  </div>
                )}

                {/* Location & Attendees */}
                <div className="flex items-center gap-3 text-xs text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                  {location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-white/70" />
                      {location}
                    </div>
                  )}
                  {(attendees !== undefined || (eventId && eventParticipation?.participantCount > 0)) && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-white/70" />
                      {displayAttendees}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button Zone - Absolutely positioned at bottom */}
            <div className="absolute bottom-6 right-2 flex items-center gap-2">
              {actionButton}
              {getSmartAction()}
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }
);

NewsCardBase.displayName = "NewsCard";

const MemoizedNewsCardBase = React.memo(NewsCardBase);
MemoizedNewsCardBase.displayName = "MemoizedNewsCard";

const NewsCard = withCardId(MemoizedNewsCardBase, "CT-CX-NEWS");

export { NewsCard, NewsCardBase };
export type { NewsCardProps };
