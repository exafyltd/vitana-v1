import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface RecommendationItem {
  id: string;
  title: string;
  subtitle?: string;
  etaMins?: number;
  priority?: "high" | "medium" | "low";
  reason_code?: string;
  location?: string;
  spots?: number;
  when?: string;
  with?: string;
}

interface RecommendationCardProps {
  title: string;
  items: RecommendationItem[];
  variant?: "horizontal" | "grid" | "list";
  showAll?: boolean;
  onItemClick?: (item: RecommendationItem) => void;
  onViewAll?: () => void;
  className?: string;
  maxItems?: number;
}

const RecommendationCardBase = React.forwardRef<HTMLDivElement, RecommendationCardProps>(
  ({ 
    title, 
    items, 
    variant = "list", 
    showAll = false,
    onItemClick,
    onViewAll,
    className,
    maxItems = 3,
    ...props 
  }, ref) => {
    const displayItems = showAll ? items : items.slice(0, maxItems);

    const getPriorityColor = (priority?: string) => {
      switch (priority) {
        case "high": return "destructive";
        case "medium": return "default";
        case "low": return "secondary";
        default: return "outline";
      }
    };

    const formatTimeEstimate = (mins?: number): string => {
      if (!mins) return "";
      if (mins < 60) return `${mins}m`;
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    };

    if (variant === "horizontal") {
      return (
        <Card ref={ref} className={cn("bg-gradient-to-r from-calendar-primary/5 to-calendar-accent/5 border-calendar-primary/20", className)} {...props}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {displayItems.map((item) => (
                <div 
                  key={item.id}
                  className="flex-shrink-0 p-3 bg-background/80 backdrop-blur-sm rounded-xl border cursor-pointer hover:shadow-md transition-all min-w-[240px]"
                  onClick={() => onItemClick?.(item)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-foreground pr-2">{item.title}</h4>
                    {item.priority && (
                      <Badge variant={getPriorityColor(item.priority)} className="text-xs shrink-0">
                        {item.priority}
                      </Badge>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground mb-2">{item.subtitle}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {item.etaMins && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeEstimate(item.etaMins)}
                      </div>
                    )}
                    {item.spots && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {item.spots} spots
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!showAll && items.length > maxItems && (
              <Button variant="ghost" size="sm" onClick={onViewAll} className="mt-3">
                View all {items.length} recommendations <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref} className={cn("bg-gradient-to-br from-calendar-accent/5 to-calendar-primary/5 border-calendar-accent/20", className)} {...props}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {displayItems.map((item) => (
            <div 
              key={item.id}
              className="p-3 bg-background/50 hover:bg-background/80 rounded-lg border transition-all cursor-pointer group"
              onClick={() => onItemClick?.(item)}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm text-foreground group-hover:text-calendar-primary transition-colors">{item.title}</h4>
                {item.priority && (
                  <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                    {item.priority}
                  </Badge>
                )}
              </div>
              
              {item.subtitle && (
                <p className="text-xs text-muted-foreground mb-2">{item.subtitle}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.etaMins && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeEstimate(item.etaMins)}
                    </div>
                  )}
                  {item.when && (
                    <span className="text-calendar-primary font-medium">{item.when}</span>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </div>
                  )}
                </div>
                
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-calendar-primary transition-colors" />
              </div>
              
              {item.with && (
                <p className="text-xs text-muted-foreground mt-2">{t('screens.templates.withWith', { with: item.with })}</p>
              )}
            </div>
          ))}
          
          {displayItems.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">{t('screens.templates.noRecommendationsAvailableRightNow')}</p>
              <p className="text-xs mt-1">{t('screens.templates.checkBackLaterForPersonalizedSuggestions')}</p>
            </div>
          )}
          
          {!showAll && items.length > maxItems && (
            <Button variant="ghost" size="sm" onClick={onViewAll} className="w-full mt-2">
              View all {items.length} recommendations <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
);

RecommendationCardBase.displayName = "RecommendationCard";

const RecommendationCard = withCardId(RecommendationCardBase, "CT-DO-002");

export { RecommendationCard, RecommendationCardBase };
export type { RecommendationCardProps, RecommendationItem };