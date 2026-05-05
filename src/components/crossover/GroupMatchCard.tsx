import { Users2, Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useToast } from '@/hooks/use-toast';
import { EventImageCard } from "@/components/events/EventImageCard";
import { transformRecommendationToCard } from "@/lib/eventCardTransformers";
import { UnifiedEventCard, UnifiedGroupCard } from "@/types/community";
import { GroupImageCard } from "@/components/groups/GroupImageCard";
import { transformGroupRecommendationToCard } from "@/lib/groupCardTransformers";
import { notify, t } from '@/lib/i18n-toast';

interface GroupMatchCardProps {
  className?: string;
}

function GroupMatchCardBase({ className }: GroupMatchCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { groups: demoGroups, events: demoEvents } = useDemoMatches();
  const [groups, setGroups] = useState<UnifiedGroupCard[]>([]);
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
              member_count,
              category,
              image_url,
              tags
            )
          `)
          .eq('is_dismissed', false)
          .gte('match_score', 0.5)
          .order('match_score', { ascending: false })
          .limit(9);

        if (groupError) throw groupError;

        if (groupData && groupData.length > 0) {
          const mappedGroups = groupData
            .filter(r => r.global_community_groups)
            .map(r => transformGroupRecommendationToCard({
              ...r,
              group: r.global_community_groups,
              compatibility_score: r.match_score,
            }));
          setGroups(mappedGroups);
        } else {
          // Use demo data as fallback
          const transformedDemo = demoGroups.slice(0, 9).map(g => ({
            id: g.id,
            name: g.name,
            description: g.description,
            category: g.category || 'Community',
            image: g.image_url || '',
            match_score: g.compatibility_score,
            member_count: g.member_count,
            tags: g.tags || [],
          }));
          setGroups(transformedDemo);
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
          .limit(6);

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
          const transformedDemo = demoEvents.slice(0, 6).map(e => transformRecommendationToCard(e));
          setEvents(transformedDemo);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        const transformedDemo = demoGroups.slice(0, 9).map(g => ({
          id: g.id,
          name: g.name,
          description: g.description,
          category: g.category || 'Community',
          image: g.image_url || '',
          match_score: g.compatibility_score,
          member_count: g.member_count,
          tags: g.tags || [],
        }));
        setGroups(transformedDemo);
        const transformedDemoEvents = demoEvents.slice(0, 6).map(e => transformRecommendationToCard(e));
        setEvents(transformedDemoEvents);
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

  const handleJoinGroup = (group: UnifiedGroupCard) => {
    if (group.id.startsWith('demo-')) {
      notify('toasts.crossover.joined');
      return;
    }
    navigate(`/comm/groups/${group.id}`);
  };

  const handleEventClick = (event: UnifiedEventCard) => {
    if (event.id.startsWith('demo-')) {
      notify('toasts.crossover.eventSelected');
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
            <p className="text-sm text-muted-foreground">{t('screens.crossover.communitiesThatMatchYourVibe')}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/comm/groups')}
          >
            View All
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <Users2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t('screens.crossover.noGroupsFound')}</h3>
            <p className="text-muted-foreground">{t('screens.crossover.checkBackSoonForCommunityGroups')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <GroupImageCard
                  key={group.id}
                  group={group}
                  variant="full"
                  showMatchScore={true}
                  onClick={handleJoinGroup}
                />
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{t('screens.crossover.perfectForYourInterests')}</span>
                <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" />
              </div>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => navigate('/comm/groups?recommended=1')}
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
              <p className="text-sm text-muted-foreground">{t('screens.crossover.eventsHappeningSoon')}</p>
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