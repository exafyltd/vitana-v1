import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RewardDot } from "@/components/ui/reward-dot";
import { Clock, MapPin, Users, Calendar, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface EventItem {
  id: string;
  title: string;
  time?: string;
  date?: string;
  type?: string;
  location?: string;
  duration?: string;
  attendees?: number;
  status?: "upcoming" | "completed" | "cancelled";
  description?: string;
}

interface EventCardProps {
  title: string;
  events: EventItem[];
  variant?: "timeline" | "list" | "compact";
  showActions?: boolean;
  onEventClick?: (event: EventItem) => void;
  onSendPlan?: (enabled: boolean) => void;
  className?: string;
  maxItems?: number;
  rewardPoints?: number;
  rewardDescription?: string;
  showReward?: boolean;
}

const EventCardBase = React.forwardRef<HTMLDivElement, EventCardProps>(
  ({ 
    title, 
    events, 
    variant = "list",
    showActions = false,
    onEventClick,
    onSendPlan,
    className,
    maxItems = 5,
    rewardPoints,
    rewardDescription = "Participate in events for credits",
    showReward = false,
    ...props 
  }, ref) => {
    const displayEvents = events.slice(0, maxItems);

    const getStatusColor = (status?: string) => {
      switch (status) {
        case "upcoming": return "default";
        case "completed": return "secondary";
        case "cancelled": return "destructive";
        default: return "outline";
      }
    };

    const getTypeColor = (type?: string) => {
      switch (type) {
        case "exercise": return "text-calendar-primary";
        case "mental": return "text-calendar-accent";
        case "hydration": return "text-calendar-secondary";
        case "nutrition": return "text-calendar-success";
        default: return "text-muted-foreground";
      }
    };

    if (variant === "timeline") {
      return (
        <Card ref={ref} className={cn("bg-gradient-to-br from-calendar-primary/5 to-calendar-accent/5 border-calendar-primary/20 relative", className)} {...props}>
          {showReward && rewardPoints && (
            <RewardDot 
              points={rewardPoints}
              description={rewardDescription}
              position="top-right"
              size="md"
            />
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
              {showActions && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{t('screens.templates.sendMessages')}</span>
                  <Switch onCheckedChange={onSendPlan} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="relative">
              {displayEvents.map((event, index) => (
                <div key={event.id} className="relative flex gap-4 pb-4 last:pb-0">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 bg-background",
                      getTypeColor(event.type).replace('text-', 'border-')
                    )} />
                    {index < displayEvents.length - 1 && (
                      <div className="w-px h-full bg-border mt-2" />
                    )}
                  </div>
                  
                  {/* Event content */}
                  <div 
                    className="flex-1 pb-2 cursor-pointer group"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-sm text-foreground group-hover:text-calendar-primary transition-colors">
                        {event.title}
                      </h4>
                      {event.time && (
                        <span className="text-xs text-calendar-primary font-medium">{event.time}</span>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {event.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.duration}
                        </div>
                      )}
                      {event.type && (
                        <Badge variant="outline" className={cn("text-xs", getTypeColor(event.type))}>
                          {event.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (variant === "compact") {
      return (
        <div ref={ref} className={cn("space-y-2", className)} {...props}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
            {showActions && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t('screens.templates.autosend')}</span>
                <Switch onCheckedChange={onSendPlan} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            {displayEvents.map((event) => (
              <div 
                key={event.id}
                className="flex items-center justify-between p-2 bg-background/50 hover:bg-background/80 rounded-lg border cursor-pointer transition-all group"
                onClick={() => onEventClick?.(event)}
              >
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-foreground group-hover:text-calendar-primary transition-colors">
                    {event.title}
                  </h4>
                  {event.time && (
                    <p className="text-xs text-calendar-primary">{event.time}</p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-calendar-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // List variant
    return (
      <Card ref={ref} className={cn("bg-gradient-to-br from-calendar-accent/5 to-calendar-primary/5 border-calendar-accent/20 relative", className)} {...props}>
        {showReward && rewardPoints && (
          <RewardDot 
            points={rewardPoints}
            description={rewardDescription}
            position="top-right"
            size="md"
          />
        )}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
            {showActions && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t('screens.templates.sendPlan')}</span>
                <Switch onCheckedChange={onSendPlan} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {displayEvents.map((event) => (
            <div 
              key={event.id}
              className="p-3 bg-background/50 hover:bg-background/80 rounded-lg border cursor-pointer transition-all group"
              onClick={() => onEventClick?.(event)}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm text-foreground group-hover:text-calendar-primary transition-colors">
                  {event.title}
                </h4>
                {event.status && (
                  <Badge variant={getStatusColor(event.status)} className="text-xs">
                    {event.status}
                  </Badge>
                )}
              </div>
              
              {event.description && (
                <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {event.time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.time}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </div>
                  )}
                  {event.attendees && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event.attendees}
                    </div>
                  )}
                </div>
                
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-calendar-primary transition-colors" />
              </div>
            </div>
          ))}
          
          {displayEvents.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('screens.templates.noEventsScheduled')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

EventCardBase.displayName = "EventCard";

const EventCard = withCardId(EventCardBase, "CT-CAL-002");

export { EventCard, EventCardBase };
export type { EventCardProps, EventItem };