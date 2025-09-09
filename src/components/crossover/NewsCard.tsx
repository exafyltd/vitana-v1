import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Users, Play, Headphones, Music, UserPlus, Calendar, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";

interface NewsCardProps {
  title: string;
  description?: string;
  imageUrl: string;
  category?: "event" | "community" | "wellness" | "achievement" | "people" | "media" | "group";
  pillar?: string;
  icon?: React.ComponentType<any>;
  mediaType?: "video" | "podcast" | "music";
  author?: {
    name: string;
    avatar?: string;
  };
  location?: string;
  attendees?: number;
  timestamp?: string;
  price?: number | "free";
  className?: string;
  onClick?: () => void;
  actionButton?: React.ReactNode;
  showSmartAction?: boolean;
  onActionClick?: () => void;
}

const NewsCardBase = React.forwardRef<HTMLDivElement, NewsCardProps>(
  ({ 
    title, 
    description, 
    imageUrl, 
    category,
    pillar,
    icon: IconComponent,
    mediaType, 
    author, 
    location, 
    attendees, 
    timestamp, 
    price,
    className, 
    onClick,
    actionButton,
    showSmartAction = false,
    onActionClick
  }, ref) => {
    
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

    // Smart action button logic based on content type
    const getSmartAction = () => {
      if (!showSmartAction) return null;
      
      let buttonText = "View";
      let buttonIcon = null;
      
      switch (category) {
        case "event":
          buttonText = "Join Now";
          buttonIcon = Calendar;
          break;
        case "people":
          buttonText = "Follow";
          buttonIcon = UserPlus;
          break;
        case "media":
          buttonText = mediaType === "video" ? "Watch Now" : 
                      mediaType === "podcast" ? "Listen Now" : 
                      mediaType === "music" ? "Play Now" : "View";
          buttonIcon = PlayCircle;
          break;
        case "group":
          buttonText = "Join Group";
          buttonIcon = Users;
          break;
        case "community":
          buttonText = "Join Now";
          buttonIcon = Calendar;
          break;
        default:
          buttonText = "View";
      }
      
      const ButtonIcon = buttonIcon;
      
      return (
        <Button
          variant="secondary"
          size="sm"
          className="bg-white/90 text-foreground hover:bg-white border-0 shadow-lg backdrop-blur-sm font-medium transition-all duration-200 hover:shadow-xl hover:scale-105"
          onClick={(e) => {
            e.stopPropagation();
            onActionClick?.();
          }}
        >
          {ButtonIcon && <ButtonIcon className="w-4 h-4" />}
          {buttonText}
        </Button>
      );
    };

    return (
      <Card 
        ref={ref}
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-0 h-full",
          className
        )}
        onClick={onClick}
      >
        <div className="relative h-full">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{ 
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          
          {/* Media Play Icon Overlay */}
          {MediaIcon && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 border-2 border-white/30 group-hover:scale-110 transition-transform duration-300">
                <MediaIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
          
          {/* Content Overlay */}
          <CardContent className="absolute inset-0 p-6 h-full flex flex-col justify-between text-white">
            {/* Top Section */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {/* Pillar badge (text only, upper left) */}
                {pillar && (
                  <div className="text-xs text-white font-medium bg-black/40 rounded-md px-2 py-1 backdrop-blur-sm border border-white/30 uppercase tracking-wide whitespace-nowrap">
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
                    {price === "free" ? "FREE" : `$${price}`}
                  </div>
                )}
              </div>
              
              {/* Timestamp (single line in upper right) */}
              {timestamp && (
                <div className="flex items-center gap-1.5 text-xs text-white/90 bg-black/40 rounded-md px-2 py-1 backdrop-blur-sm whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{timestamp}</span>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-end space-y-3">
              {/* Title */}
              <h3 className="text-lg font-bold leading-tight group-hover:text-primary-foreground transition-colors">
                {title}
              </h3>
              
              {/* Description */}
              {description && (
                <p className="text-sm text-white/90 line-clamp-2 leading-relaxed">
                  {description}
                </p>
              )}

              {/* Meta Information */}
              <div className="flex items-center justify-between">
                {/* Author */}
                {author && (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6 border-2 border-white/30">
                      <AvatarImage src={author.avatar} alt={author.name} />
                      <AvatarFallback className="text-xs bg-white/20 text-white">
                        {author.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-white/90 font-medium">
                      {author.name}
                    </span>
                  </div>
                )}

                {/* Location & Attendees */}
                <div className="flex items-center gap-3 text-xs text-white/80">
                  {location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {location}
                    </div>
                  )}
                  {attendees && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {attendees}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button Zone - Always at bottom */}
            <div className="flex justify-end items-center gap-2 pt-3 mt-2">
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

const NewsCard = withCardId(NewsCardBase, "CT-CX-NEWS");

export { NewsCard, NewsCardBase };
export type { NewsCardProps };