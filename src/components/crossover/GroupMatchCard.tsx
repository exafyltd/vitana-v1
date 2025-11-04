import { Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { toast } from "sonner";
import { EventImageCard } from "@/components/events/EventImageCard";
import { transformRecommendationToCard } from "@/lib/eventCardTransformers";
import { UnifiedEventCard, UnifiedGroupCard } from "@/types/community";
import { CategoryHeroCard } from "@/components/groups/CategoryHeroCard";
import { CategoryFilterBar } from "@/components/groups/CategoryFilterBar";
import { CategoryGroupSection } from "@/components/groups/CategoryGroupSection";
import { transformGroupRecommendationToCard } from "@/lib/groupCardTransformers";
import { getCategoryTheme } from "@/lib/categoryThemes";

interface GroupMatchCardProps {
  className?: string;
}

function GroupMatchCardBase({ className }: GroupMatchCardProps) {
  const navigate = useNavigate();
  const { groups: demoGroups, events: demoEvents } = useDemoMatches();
  const [groups, setGroups] = useState<UnifiedGroupCard[]>([]);
  const [events, setEvents] = useState<UnifiedEventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

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
          .limit(6);

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
          const transformedDemo = demoGroups.slice(0, 6).map(g => ({
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
        const transformedDemo = demoGroups.slice(0, 6).map(g => ({
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
        const transformedDemoEvents = demoEvents.slice(0, 3).map(e => transformRecommendationToCard(e));
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
      toast.success(`✓ Joined ${group.name}!`, {
        description: `You're now part of this ${group.category.toLowerCase()} group`
      });
      return;
    }
    navigate(`/community/groups/${group.id}`);
  };

  const handleEventClick = (event: UnifiedEventCard) => {
    if (event.id.startsWith('demo-')) {
      toast.success(`You're interested in ${event.title}!`);
      return;
    }
    navigate(`/community/events/${event.id}`);
  };

  // Group by category
  const groupsByCategory = groups.reduce((acc, group) => {
    const cat = group.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(group);
    return acc;
  }, {} as Record<string, UnifiedGroupCard[]>);

  // Calculate category stats
  const categoryStats = Object.entries(groupsByCategory).map(([category, grps]) => ({
    category,
    matchScore: Math.round(grps.reduce((sum, g) => sum + (g.match_score || 0), 0) / grps.length),
    memberCount: grps.reduce((sum, g) => sum + g.member_count, 0),
    groupCount: grps.length
  })).sort((a, b) => b.matchScore - a.matchScore);

  // Top 4 categories for hero cards
  const topCategories = categoryStats.slice(0, 4);

  // Filtered groups based on active category
  const filteredGroups = activeCategory === 'all' 
    ? groupsByCategory 
    : { [activeCategory]: groupsByCategory[activeCategory] || [] };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    // Smooth scroll to category sections
    setTimeout(() => {
      const element = document.getElementById(`category-${category}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Groups & Communities Section */}
      {groups.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Groups & Communities</h3>
              <p className="text-sm text-muted-foreground">Connect with like-minded people</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/community/groups')}
            >
              View All
            </Button>
          </div>

          {/* Tier 1: Category Hero Cards */}
          {topCategories.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {topCategories.map((stat) => {
                const theme = getCategoryTheme(stat.category);
                return (
                  <CategoryHeroCard
                    key={stat.category}
                    category={stat.category}
                    icon={theme.icon}
                    matchScore={stat.matchScore}
                    memberCount={stat.memberCount}
                    groupCount={stat.groupCount}
                    theme={theme}
                    onClick={() => handleCategoryClick(stat.category)}
                  />
                );
              })}
            </div>
          )}

          {/* Tier 2: Category Filter Bar */}
          <CategoryFilterBar
            categories={categoryStats}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Tier 3: Categorized Group Sections */}
          <div className="space-y-8">
            {Object.entries(filteredGroups).map(([category, categoryGroups]) => {
              const theme = getCategoryTheme(category);
              return (
                <div key={category} id={`category-${category}`}>
                  <CategoryGroupSection
                    category={category}
                    icon={theme.icon}
                    groups={categoryGroups}
                    theme={theme}
                    onGroupClick={handleJoinGroup}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

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