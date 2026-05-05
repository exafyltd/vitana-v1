import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, DollarSign, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface OfferItem {
  id: string;
  title: string;
  provider?: string;
  price?: number;
  rating?: number;
  duration?: string;
  availability?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  type?: "service" | "product" | "lab" | "content";
}

interface OfferCardProps {
  offers: OfferItem[];
  title?: string;
  variant?: "grid" | "list" | "compact";
  showPricing?: boolean;
  onOfferClick?: (offer: OfferItem) => void;
  className?: string;
  maxItems?: number;
}

const OfferCardBase = React.forwardRef<HTMLDivElement, OfferCardProps>(
  ({ 
    offers, 
    title = "Recommended for You",
    variant = "grid", 
    showPricing = true,
    onOfferClick,
    className,
    maxItems = 6,
    ...props 
  }, ref) => {
    const displayOffers = offers.slice(0, maxItems);

    const formatPrice = (price?: number): string => {
      if (!price) return "";
      return `$${price}`;
    };

    const renderOfferContent = (offer: OfferItem) => (
      <div 
        key={offer.id}
        className="p-3 bg-background/80 backdrop-blur-sm rounded-lg border cursor-pointer hover:shadow-md hover:border-calendar-primary/30 transition-all group"
        onClick={() => onOfferClick?.(offer)}
      >
        {offer.imageUrl && (
          <div className="w-full h-20 bg-gradient-to-br from-calendar-primary/10 to-calendar-accent/10 rounded-lg mb-3 overflow-hidden">
            <img 
              src={offer.imageUrl} 
              alt={offer.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm text-foreground group-hover:text-calendar-primary transition-colors line-clamp-2">
              {offer.title}
            </h4>
            {offer.rating && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-2">
                <Star className="w-3 h-3 fill-calendar-accent text-calendar-accent" />
                {offer.rating}
              </div>
            )}
          </div>
          
          {offer.provider && (
            <p className="text-xs text-muted-foreground">{offer.provider}</p>
          )}
          
          {offer.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{offer.description}</p>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {offer.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {offer.duration}
                </div>
              )}
              {offer.category && (
                <Badge variant="secondary" className="text-xs">
                  {offer.category}
                </Badge>
              )}
            </div>
            
            {showPricing && offer.price && (
              <div className="flex items-center gap-1 text-sm font-semibold text-calendar-primary">
                <DollarSign className="w-3 h-3" />
                {offer.price}
              </div>
            )}
          </div>
          
          {offer.availability && (
            <div className="flex items-center gap-1 text-xs text-calendar-success">
              <MapPin className="w-3 h-3" />
              {offer.availability}
            </div>
          )}
        </div>
      </div>
    );

    if (variant === "compact") {
      return (
        <div ref={ref} className={cn("space-y-2", className)} {...props}>
          {title && (
            <h3 className="text-sm font-semibold tracking-wide text-foreground mb-3">{title}</h3>
          )}
          <div className="space-y-2">
            {displayOffers.map(renderOfferContent)}
          </div>
        </div>
      );
    }

    if (variant === "list") {
      return (
        <Card ref={ref} className={cn("bg-gradient-to-br from-calendar-primary/5 to-calendar-accent/5 border-calendar-primary/20", className)} {...props}>
          {title && (
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
            </CardHeader>
          )}
          <CardContent className="space-y-3 pt-0">
            {displayOffers.map(renderOfferContent)}
            
            {displayOffers.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">{t('screens.templates.noOffersAvailableRightNow')}</p>
                <p className="text-xs mt-1">{t('screens.templates.checkBackLaterForNewRecommendations')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // Grid variant
    return (
      <Card ref={ref} className={cn("bg-gradient-to-br from-calendar-primary/5 to-calendar-accent/5 border-calendar-primary/20", className)} {...props}>
        {title && (
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {displayOffers.map(renderOfferContent)}
          </div>
          
          {displayOffers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{t('screens.templates.noOffersAvailableRightNow')}</p>
              <p className="text-xs mt-1">{t('screens.templates.checkBackLaterForNewRecommendations')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

OfferCardBase.displayName = "OfferCard";

const OfferCard = withCardId(OfferCardBase, "CT-DO-001");

export { OfferCard, OfferCardBase };
export type { OfferCardProps, OfferItem };