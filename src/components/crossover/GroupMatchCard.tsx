import { Users2, MapPin, Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { useToast } from "@/hooks/use-toast";
import { EventImageCard } from "@/components/events/EventImageCard";
import { transformRecommendationToCard } from "@/lib/eventCardTransformers";
import { UnifiedEventCard } from "@/types/events";

interface GroupMatch {
  id: string;
  name: string;
  description: string;
  category: string;
  member_count: number;
  compatibility_score: number;
  match_reason: string;
}

interface GroupMatchCardProps {
  className?: string;
}

function GroupMatchCardBase({ className }: GroupMatchCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { groups: demoGroups, events: demoEvents } = useDemoMatches();
  const [groups, setGroups] = useState<GroupMatch[]>([]);
  const [events, setEvents] = useState<UnifiedEventCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Fetch group recommendations with group details
        const { data: groupData, error: groupError } = await supabase
          .from('group_recommendations')
          .select(`
            match_score,
            match_reasons,
            global_community_groups (
              id,
              name,
              description,
              category,
              member_count
            )
          `)
          .eq('is_dismissed', false)
          .gte('match_score', 0.5)
          .order('match_score', { ascending: false })
          .limit(3);

        if (groupError) throw groupError;

        if (groupData && groupData.length > 0) {
          const mapped = groupData
            .filter(r => r.global_community_groups)
            .map(r => ({
              id: r.global_community_groups.id,
              name: r.global_community_groups.name,
              description: r.global_community_groups.description || '',
              category: r.global_community_groups.category || 'general',
              member_count: r.global_community_groups.member_count,
              compatibility_score: Math.round(r.match_score * 100),
              match_reason: Array.isArray(r.match_reasons) && r.match_reasons.length > 0
                ? (r.match_reasons as string[])[0]
                : 'Great match for you'
            }));
          setGroups(mapped);
        } else {
          // Use demo data as fallback
          setGroups(demoGroups);
        }

        // Fetch event recommendations
        const { data: eventData, error: eventError } = await supabase
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

        if (eventError) throw eventError;

        if (eventData && eventData.length > 0) {
          const mappedEvents = eventData
            .filter(r => r.global_community_events)
            .map(r => transformRecommendationToCard({
              ...r,
              global_community_events: r.global_community_events
            }));
          setEvents(mappedEvents);
        } else {
          // Use demo data as fallback
          const transformedDemo = demoEvents.slice(0, 3).map(e => transformRecommendationToCard(e));
          setEvents(transformedDemo);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setGroups(demoGroups);
        const transformedDemo = demoEvents.slice(0, 3).map(e => transformRecommendationToCard(e));
        setEvents(transformedDemo);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [demoGroups, demoEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleJoinGroup = (group: GroupMatch) => {
    if (group.id.startsWith('demo-')) {
      toast({
        title: "✓ Joined",
        description: `You're now part of ${group.name}!`,
        duration: 3000,
      });
      return;
    }
    navigate(`/community/groups/${group.id}`);
  };

  const handleEventClick = (event: UnifiedEventCard) => {
    if (event.id.startsWith('demo-')) {
      toast({
        title: "✓ Event Selected",
        description: `Viewing ${event.title}`,
        duration: 2000,
      });
      return;
    }
    navigate(`/community/events/${event.id}`);
  };

  return (
    <div className="space-y-8">
      {/* Groups Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users2 className="w-5 h-5" />
              Groups & Communities
            </h2>
            <p className="text-sm text-muted-foreground">Communities that match your vibe</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/community/groups')}
          >
            View All
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <Users2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No groups found</h3>
            <p className="text-muted-foreground">Check back soon for community groups!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <div 
                  key={group.id} 
                  className="p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border shadow-sm hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                  onClick={() => handleJoinGroup(group)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-sm leading-tight">{group.name}</h4>
                    <Badge className="bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-0 text-xs">
                      {group.compatibility_score}%
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="capitalize">{group.category}</span>
                    </div>
                    <p className="line-clamp-2">{group.match_reason}</p>
                    <p className="font-medium text-foreground">{group.member_count} members</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">Perfect for your interests</span>
                <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" />
              </div>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => navigate('/community/groups?recommended=1')}
                className="text-sm"
              >
                See more →
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Events Section */}
      {events.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Events
              </h3>
              <p className="text-sm text-muted-foreground">Events happening soon</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/community/events')}
            >
              View All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventImageCard
                key={event.id}
                event={event}
                variant="compact"
                showMatchScore={true}
                onClick={handleEventClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const GroupMatchCard = withCardId(GroupMatchCardBase, "CT-CX-015", "C-015");