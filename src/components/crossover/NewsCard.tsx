import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Clock, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";

interface NewsCardProps {
  title: string;
  description?: string;
  imageUrl: string;
  category: "event" | "community" | "wellness" | "achievement";
  pillar?: string;
  icon?: React.ComponentType<any>;
  author?: {
    name: string;
    avatar?: string;
  };
  location?: string;
  attendees?: number;
  timestamp?: string;
  className?: string;
  onClick?: () => void;
}

const NewsCardBase = React.forwardRef<HTMLDivElement, NewsCardProps>(
  ({ 
    title, 
    description, 
    imageUrl, 
    category,
    pillar,
    icon: IconComponent, 
    author, 
    location, 
    attendees, 
    timestamp, 
    className, 
    onClick 
  }, ref) => {
    
    const categoryStyles = {
      event: "bg-primary/20 text-primary border-primary/30",
      community: "bg-secondary/20 text-secondary-foreground border-secondary/30",
      wellness: "bg-accent/20 text-accent-foreground border-accent/30",
      achievement: "bg-muted/20 text-foreground border-muted/30"
    };

    return (
      <Card 
        ref={ref}
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-0",
          className
        )}
        onClick={onClick}
      >
        <div className="relative h-64 md:h-72">
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
          
          {/* Content Overlay */}
          <CardContent className="absolute inset-0 p-6 flex flex-col justify-between text-white">
            {/* Top Section */}
            <div className="flex justify-between items-start">
              {/* Pillar icon only (moved to upper left) */}
              {pillar && IconComponent && (
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm border border-white/30">
                  <IconComponent className="w-4 h-4 text-white" />
                  <span className="text-xs text-white font-medium uppercase tracking-wide">{pillar}</span>
                </div>
              )}
              
              {/* Timestamp (single line in upper right) */}
              {timestamp && (
                <div className="flex items-center gap-1.5 text-xs text-white/90 bg-black/40 rounded-md px-2 py-1 backdrop-blur-sm whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{timestamp}</span>
                </div>
              )}
            </div>

            {/* Bottom Content */}
            <div className="space-y-3">
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