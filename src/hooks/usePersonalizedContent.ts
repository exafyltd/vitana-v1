import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { transformCommunityEvent, blendEventsWithFallback } from "@/lib/eventTransformers";
import type { UIEvent } from "@/lib/eventTransformers";

export interface PersonalizedContent {
  todayEvents: UIEvent[];
  upcomingEvents: UIEvent[];
  recommendations: UIEvent[];
  loading: boolean;
}

export function usePersonalizedContent(maxEvents: number = 5) {
  const { todayEvents, upcomingEvents, loading: eventsLoading } = useCommunityEvents();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const [recommendations, setRecommendations] = useState<UIEvent[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Score events based on user preferences
  const scoreEvent = (event: any): number => {
    let score = 0;
    const prefs = preferences;

    // Wellness pillar match (use autopilot categories as proxy)
    const eventPillar = event.pillar || 'Mental';
    const categories = prefs?.autopilot_categories;
    if (categories?.community || categories?.health) {
      score += 2;
    }

    // Event type match - boost if it's a community event
    if (event.event_type === 'meetup' || event.type === 'event') {
      score += 2;
    }

    // Recency boost (newer events get higher score)
    const hoursSinceCreation = (Date.now() - new Date(event.created_at || event.start_time).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation < 24) {
      score += 2; // Brand new content
    } else if (hoursSinceCreation < 72) {
      score += 1; // Recent content
    }

    // Popularity boost
    const attendees = event.participant_count || event.attendees || 0;
    if (attendees > 50) score += 2;
    else if (attendees > 20) score += 1;

    return score;
  };

  // Fetch AI recommendations when no matching content
  const fetchRecommendations = async () => {
    try {
      setAiLoading(true);
      
      const recentEvents = [...todayEvents, ...upcomingEvents].slice(0, 5).map(e => ({
        title: e.title,
        event_type: e.event_type,
        participant_count: e.participant_count,
      }));

      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          userPreferences: preferences,
          recentEvents,
        }
      });

      if (error) {
        console.error("AI recommendation error:", error);
        return;
      }

      if (data?.recommendations) {
        const transformedRecs = data.recommendations.map((rec: any, idx: number) => ({
          id: `ai-rec-${idx}`,
          title: rec.title,
          time: 'Recommended',
          description: rec.description,
          pillar: rec.pillar,
          type: rec.type,
          imageUrl: `https://images.unsplash.com/photo-${1500000000000 + idx}?w=800&h=600&fit=crop`,
        }));
        setRecommendations(transformedRecs);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setAiLoading(false);
    }
  };

  // Transform and score real events
  const processEvents = (events: any[]): UIEvent[] => {
    return events
      .map(event => {
        const transformed = transformCommunityEvent(event);
        return {
          ...transformed,
          score: scoreEvent(event),
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  useEffect(() => {
    // Fetch AI recommendations if we have very few events
    const totalEvents = todayEvents.length + upcomingEvents.length;

    if (totalEvents < 2 && preferences) {
      fetchRecommendations();
    }
  }, [todayEvents.length, upcomingEvents.length, preferences]);

  const scoredTodayEvents = processEvents(todayEvents);
  const scoredUpcomingEvents = processEvents(upcomingEvents);

  return {
    todayEvents: scoredTodayEvents.slice(0, maxEvents),
    upcomingEvents: scoredUpcomingEvents.slice(0, maxEvents),
    recommendations: recommendations.slice(0, maxEvents),
    loading: eventsLoading || preferencesLoading || aiLoading,
  };
}
