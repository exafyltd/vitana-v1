import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, Users, ArrowRight } from "lucide-react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { useEventSelection } from "@/context/EventSelectionContext";
import { t } from '@/lib/i18n-toast';

import { fmtDate, fmtTime } from '@/lib/locale-format';
interface CommunityEventsCardProps {
  maxEvents?: number;
  className?: string;
}

function CommunityEventsCardBase({ maxEvents = 3, className }: CommunityEventsCardProps) {
  const { todayEvents, upcomingEvents, loading } = useCommunityEvents();
  const navigate = useNavigate();
  const { selectEvent } = useEventSelection();

  const displayEvents = [...todayEvents, ...upcomingEvents].slice(0, maxEvents);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {t('screens.home.communityEvents')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayEvents.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {t('screens.home.communityEvents')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">{t('screens.home.noUpcomingEvents')}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => navigate('/community/meetups')}
            >
              {t('screens.home.createEvent')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today ${fmtTime(date, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow ${fmtTime(date, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
    
    const day = fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' });
    const time = fmtTime(date, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} · ${time}`;
  };

  return (
    <Card className={className || "h-full"}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {t('screens.home.communityEvents')}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/community/meetups')}
            className="text-muted-foreground hover:text-primary"
          >
            {t('screens.home.viewAll')}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              selectEvent(event.id);
            }}
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate mb-1">
                {event.title}
              </h4>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatEventTime(event.start_time)}
                </div>
                
                {event.participant_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.participant_count}
                  </div>
                )}
              </div>
              
              {event.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {event.event_type}
                </Badge>
                
                {todayEvents.some(e => e.id === event.id) && (
                  <Badge variant="outline" className="text-xs text-primary border-primary">
                    {t('screens.home.today')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {displayEvents.length > 0 && (
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => navigate('/community/meetups')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {t('screens.home.viewAllEvents')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export const CommunityEventsCard = withCardId(CommunityEventsCardBase, "CT-CX-EVENTS");