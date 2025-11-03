import { CrossoverCard } from "./CrossoverCard";
import { Calendar, MapPin, Users, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { events: demoEvents } = useDemoMatches();
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

        if (data && data.length > 0) {
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
        } else {
          // Use demo data as fallback
          setEvents(demoEvents);
        }
      } catch (error) {
        console.error('Failed to fetch event recommendations:', error);
        setEvents(demoEvents);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [demoEvents]);

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
        return `Today ${format(date, 'HH:mm')}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow ${format(date, 'HH:mm')}`;
      } else {
        return format(date, 'EEE HH:mm');
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

  const handleRSVP = (event: EventMatch) => {
    if (event.id.startsWith('demo-')) {
      toast({
        title: "✓ RSVP Confirmed",
        description: `You're registered for ${event.title}!`,
        duration: 3000,
      });
      return;
    }
    navigate(`/community/events/${event.id}`);
  };

  const content = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Curated for your interests
      </p>
      
      {events.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {events.map((event) => (
            <div 
              key={event.id} 
              className="p-3.5 rounded-2xl bg-card/70 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-all duration-300 cursor-pointer"
              onClick={() => handleRSVP(event)}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
                <div className="flex items-center gap-1">
                  <Badge className={`text-xs ${getCategoryColor(event.event_type)}`} variant="secondary">
                    {event.event_type}
                  </Badge>
                  <Badge variant="default" className="text-xs bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-0">
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
          ))}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">Perfect timing for you</span>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
            </div>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => navigate('/community/events?recommended=1')}
              className="text-xs text-primary"
            >
              See more →
            </Button>
          </div>
        </>
      )}
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