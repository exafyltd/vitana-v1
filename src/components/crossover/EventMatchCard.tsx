import { CrossoverCard } from "./CrossoverCard";
import { Calendar, MapPin, Users, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface EventMatch {
  id: string;
  title: string;
  start_time: string;
  location: string;
  participant_count: number;
  event_type: string;
  match_score: number;
  match_reasons: string[];
}

interface EventMatchCardProps {
  className?: string;
}

function EventMatchCardBase({ className }: EventMatchCardProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Fetch event recommendations with event details
        const { data, error } = await supabase
          .from('event_recommendations')
          .select(`
            match_score,
            match_reasons,
            global_community_events (
              id,
              title,
              start_time,
              location,
              participant_count,
              event_type
            )
          `)
          .eq('is_dismissed', false)
          .gte('match_score', 0.5)
          .order('match_score', { ascending: false })
          .limit(3);

        if (error) throw error;

        if (data) {
          const mapped = data
            .filter(r => r.global_community_events)
            .map(r => ({
              id: r.global_community_events.id,
              title: r.global_community_events.title,
              start_time: r.global_community_events.start_time,
              location: r.global_community_events.location || 'Online',
              participant_count: r.global_community_events.participant_count,
              event_type: r.global_community_events.event_type,
              match_score: r.match_score,
              match_reasons: Array.isArray(r.match_reasons) ? r.match_reasons as string[] : []
            }));
          setEvents(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch event recommendations:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "health": return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400";
      case "meetup": return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400";
      case "wellness": return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400";
      case "workshop": return "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400";
      default: return "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400";
    }
  };

  const formatEventTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return `Today ${format(date, 'h:mm a')}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow ${format(date, 'h:mm a')}`;
      } else {
        return format(date, 'EEE h:mm a');
      }
    } catch {
      return 'Date TBD';
    }
  };

  if (loading) {
    return (
      <CrossoverCard
        icon={Calendar}
        category="mental"
        title="Relevant Events 📅"
        subtitle="Finding perfect matches..."
        content={
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
        buttonText="RSVP"
        onButtonClick={() => {}}
        className={className}
      />
    );
  }

  const content = (
    <div className="space-y-3">
      {events.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No event matches yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon!</p>
        </div>
      ) : (
        events.map((event) => (
          <div key={event.id} className="p-2 bg-secondary/20 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
              <div className="flex items-center gap-1">
                <Badge className={`text-xs ${getCategoryColor(event.event_type)}`} variant="secondary">
                  {event.event_type}
                </Badge>
                <Badge variant="default" className="text-xs">
                  {Math.round(event.match_score * 100)}%
                </Badge>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatEventTime(event.start_time)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{event.participant_count} attending</span>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="mt-4 p-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Curated for your interests</span>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Calendar}
      category="mental"
      title="Relevant Events 📅"
      subtitle="Discover events matched to your interests"
      content={content}
      buttonText="RSVP"
      onButtonClick={() => navigate('/community/events')}
      secondaryButtonText="Add to Cal"
      onSecondaryButtonClick={() => navigate('/calendar/events')}
      className={className}
    />
  );
}

export const EventMatchCard = withCardId(EventMatchCardBase, "CT-CX-018", "C-018");