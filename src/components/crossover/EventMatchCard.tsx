import { Calendar, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useToast } from '@/hooks/use-toast';
import { EventImageCard } from "@/components/events/EventImageCard";
import { transformRecommendationToCard } from "@/lib/eventCardTransformers";
import { UnifiedEventCard } from "@/types/community";
import { notify } from '@/lib/i18n-toast';


interface EventMatchCardProps {
  className?: string;
}

function EventMatchCardBase({ className }: EventMatchCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { events: demoEvents } = useDemoMatches();
  const [events, setEvents] = useState<UnifiedEventCard[]>([]);
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
            .map(r => transformRecommendationToCard({
              ...r,
              global_community_events: r.global_community_events
            }));
          setEvents(mapped);
        } else {
          // Use demo data as fallback
          const transformedDemo = demoEvents.map(e => transformRecommendationToCard(e));
          setEvents(transformedDemo);
        }
      } catch (error) {
        console.error('Failed to fetch event recommendations:', error);
        const transformedDemo = demoEvents.map(e => transformRecommendationToCard(e));
        setEvents(transformedDemo);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [demoEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleEventClick = (event: UnifiedEventCard) => {
    if (event.id.startsWith('demo-')) {
      notify('toasts.crossover.eventSelected');
      return;
    }
    navigate(`/community/events/${event.id}`);
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No events found</h3>
        <p className="text-muted-foreground">Check back soon for upcoming community events!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Relevant Events 📅</h2>
          <p className="text-sm text-muted-foreground">Curated for your interests</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/community/events')}
        >
          View All
        </Button>
      </div>

      {/* Event Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.slice(0, 6).map((event) => (
          <EventImageCard
            key={event.id}
            event={event}
            variant="full"
            showMatchScore={true}
            onClick={handleEventClick}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Perfect timing for you</span>
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
        <Button 
          variant="link" 
          size="sm" 
          onClick={() => navigate('/community/events?recommended=1')}
          className="text-sm"
        >
          See more →
        </Button>
      </div>
    </div>
  );
}

export const EventMatchCard = withCardId(EventMatchCardBase, "CT-CX-018", "C-018");