import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Plus, Edit, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { useNavigate } from "react-router-dom";
import { NewsCard } from "@/components/crossover/NewsCard";
import { format, formatDistanceToNow, addDays } from "date-fns";
import { t } from '@/lib/i18n-toast';

// TODO: Remove mock data once real events are populated
const MOCK_EVENTS: CommunityEvent[] = [
  {
    id: 'mock-event-1',
    title: '🌅 Sunrise Yoga & Meditation',
    description: 'Start your day with intention. Join us for a peaceful morning session combining gentle yoga flows with guided meditation overlooking the city skyline.',
    start_time: addDays(new Date(), 3).toISOString(),
    end_time: addDays(new Date(), 3).toISOString(),
    location: 'Rooftop Wellness Studio',
    participant_count: 12,
    event_type: 'yoga',
    created_by: 'mock-creator-1'
  },
  {
    id: 'mock-event-2',
    title: '🧘 Mindfulness & Breathwork Circle',
    description: 'A transformative evening of guided breathwork, meditation, and conscious connection. Perfect for releasing stress and finding inner peace.',
    start_time: addDays(new Date(), 7).toISOString(),
    end_time: addDays(new Date(), 7).toISOString(),
    location: 'Virtual',
    participant_count: 28,
    event_type: 'meditation',
    created_by: 'mock-creator-2'
  },
  {
    id: 'mock-event-3',
    title: '🏃‍♀️ Morning Run & Coffee Social',
    description: 'Join fellow runners for an energizing 5K through the park, followed by coffee and community conversation. All fitness levels welcome!',
    start_time: addDays(new Date(), 5).toISOString(),
    end_time: addDays(new Date(), 5).toISOString(),
    location: 'Central Park - North Meadow',
    participant_count: 45,
    event_type: 'fitness',
    created_by: 'mock-creator-3'
  },
  {
    id: 'mock-event-4',
    title: '🌿 Wellness Workshop: Nutrition Basics',
    description: 'Learn the fundamentals of intuitive eating and meal planning with our certified nutritionist. Practical tips and Q&A session included.',
    start_time: addDays(new Date(), 10).toISOString(),
    end_time: addDays(new Date(), 10).toISOString(),
    location: 'Community Wellness Center',
    participant_count: 18,
    event_type: 'nutrition',
    created_by: 'mock-creator-4'
  }
];

// Minimum events to show in each tab (blend real + mock)
const MIN_EVENTS_PER_TAB = 4;

interface ProfileEventsTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  isOwnProfile?: boolean;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
  participant_count: number;
  event_type: string;
  created_by: string;
  image_url?: string;
}

export function ProfileEventsTab({ profile, scope, editMode, isOwnProfile }: ProfileEventsTabProps) {
  const [createdEvents, setCreatedEvents] = useState<CommunityEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      // If profile.user_id is missing, immediately show mock data
      if (!profile.user_id) {
        setCreatedEvents(MOCK_EVENTS.slice(0, 2));
        setJoinedEvents(MOCK_EVENTS.slice(2, 4));
        console.debug('[ProfileEventsTab] Using mock data: no profile.user_id', { created: 2, joined: 2 });
        setLoading(false);
        return;
      }
      
      try {
        // Fetch events created by user
        const { data: created, error: createdError } = await supabase
          .from('global_community_events')
          .select('*')
          .eq('created_by', profile.user_id)
          .order('start_time', { ascending: false });

        if (createdError) throw createdError;

        // Fetch events user has joined
        const { data: joinedData, error: joinedError } = await supabase
          .from('global_event_participants')
          .select(`
            event_id,
            global_community_events (
              id,
              title,
              description,
              start_time,
              end_time,
              location,
              participant_count,
              event_type,
              created_by,
              image_url
            )
          `)
          .eq('user_id', profile.user_id)
          .eq('status', 'attending');

        if (joinedError) throw joinedError;

        const createdEventsData = created || [];
        const joinedEventsData = joinedData?.map(item => item.global_community_events).filter(Boolean) as CommunityEvent[] || [];
        
        // Blend real events with mock events to ensure minimum count
        const supplementCreatedEvents = (events: CommunityEvent[]) => {
          if (events.length >= MIN_EVENTS_PER_TAB) return events;
          
          const needed = MIN_EVENTS_PER_TAB - events.length;
          const mockToAdd = MOCK_EVENTS
            .slice(0, needed)
            .map(e => ({ ...e, created_by: profile.user_id }));
          
          return [...events, ...mockToAdd];
        };

        const supplementJoinedEvents = (events: CommunityEvent[]) => {
          if (events.length >= MIN_EVENTS_PER_TAB) return events;
          
          const needed = MIN_EVENTS_PER_TAB - events.length;
          const mockToAdd = MOCK_EVENTS.slice(0, needed);
          
          return [...events, ...mockToAdd];
        };

        setCreatedEvents(supplementCreatedEvents(createdEventsData));
        setJoinedEvents(supplementJoinedEvents(joinedEventsData));

        console.debug('[ProfileEventsTab] Event counts:', {
          created: { real: createdEventsData.length, total: supplementCreatedEvents(createdEventsData).length },
          joined: { real: joinedEventsData.length, total: supplementJoinedEvents(joinedEventsData).length }
        });
      } catch (error) {
        console.error('Error fetching events:', error);
        setCreatedEvents(MOCK_EVENTS.slice(0, MIN_EVENTS_PER_TAB).map(e => ({ ...e, created_by: profile.user_id })));
        setJoinedEvents(MOCK_EVENTS.slice(0, MIN_EVENTS_PER_TAB));
        console.debug('[ProfileEventsTab] Using mock data: fetch error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [profile.user_id]);

  // Map event type to pillar (for NewsCard)
  const eventTypeToPillar = (eventType: string): string => {
    const mapping: Record<string, string> = {
      'event': 'Community',
      'meetup': 'Social',
      'fitness': 'Movement',
      'meditation': 'Mindfulness',
      'yoga': 'Movement',
      'nutrition': 'Nutrition',
      'wellness': 'Wellness',
    };
    return mapping[eventType.toLowerCase()] || 'Event';
  };

  // Themed placeholder images by event type
  const PLACEHOLDER_BY_TYPE: Record<string, string> = {
    fitness: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    meditation: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    yoga: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    nutrition: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    event: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    meetup: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
  };

  // Get event image URL with themed fallback
  const getEventImageUrl = (event: CommunityEvent): string => {
    return event.image_url || PLACEHOLDER_BY_TYPE[event.event_type?.toLowerCase()] || PLACEHOLDER_BY_TYPE.event;
  };

  // Format timestamp for NewsCard
  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date > now) {
      // Future event - show relative time
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      // Past event - show date
      return format(date, 'MMM dd, yyyy');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-2xl bg-white/40 dark:bg-white/10 animate-pulse overflow-hidden">
            <div className="h-24 bg-white/30 dark:bg-white/5"></div>
            <CardContent className="p-5 space-y-3">
              <div className="h-5 bg-white/60 dark:bg-white/10 rounded-lg w-3/4"></div>
              <div className="h-4 bg-white/40 dark:bg-white/5 rounded w-full"></div>
              <div className="h-4 bg-white/40 dark:bg-white/5 rounded w-5/6"></div>
              <div className="h-9 bg-white/50 dark:bg-white/10 rounded-full mt-4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasAnyEvents = createdEvents.length > 0 || joinedEvents.length > 0;

  if (!hasAnyEvents) {
    return (
      <div className="text-center py-16 px-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-50 to-sky-50 dark:from-violet-950/30 dark:to-sky-950/30 mb-6">
          <Calendar className="w-10 h-10 text-primary/60" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">
          {isOwnProfile ? "Your event journey begins here ✨" : `${profile.name?.split(' ')[0]} hasn't joined any events`}
        </h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          {isOwnProfile 
            ? "Connect with like-minded souls at wellness gatherings, creative workshops, and transformative meetups."
            : "Check back later for event activity"
          }
        </p>
        {isOwnProfile && (
          <Button variant="solid" onClick={() => navigate('/community/meetups')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('screens.profile.createEvent')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="created" className="w-full">
        {/* Custom Tab Styling with Gradient Underline */}
        <div className="relative mb-8">
          <TabsList className="inline-flex h-auto items-center justify-start gap-8 bg-transparent p-0 border-b border-white/20 w-full">
            <TabsTrigger 
              value="created"
              className="relative bg-transparent px-0 pb-3 pt-0 font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-violet-400 after:to-sky-400 after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
            >
              Created ({createdEvents.length})
            </TabsTrigger>
            <TabsTrigger 
              value="joined"
              className="relative bg-transparent px-0 pb-3 pt-0 font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-violet-400 after:to-sky-400 after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
            >
              Joined ({joinedEvents.length})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="created" className="mt-0">
          {createdEvents.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-50 to-sky-50 dark:from-violet-950/30 dark:to-sky-950/30 mb-5">
                <Calendar className="w-8 h-8 text-primary/60" />
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {isOwnProfile ? "You haven't created any events yet — share your passion with the community! ✨" : "No events created"}
              </p>
              {isOwnProfile && (
                <Button 
                  variant="solid"
                  onClick={() => navigate('/community/meetups')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('screens.profile.createEvent')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {createdEvents.map((event) => {
                const isMock = event.id.startsWith('mock-');
                const isUpcoming = new Date(event.start_time) > new Date();
                
                return (
                  <NewsCard
                    key={event.id}
                    title={event.title}
                    description={event.description}
                    imageUrl={getEventImageUrl(event)}
                    category="event"
                    pillar={eventTypeToPillar(event.event_type)}
                    author={{
                      name: profile.name || "Community",
                      avatar: profile.avatarUrl
                    }}
                    location={event.location || "Virtual"}
                    attendees={event.participant_count}
                    timestamp={formatTimestamp(event.start_time)}
                    className="min-h-[320px] md:min-h-[360px]"
                    showSmartAction={!isMock}
                    eventId={isMock ? undefined : event.id}
                    data-event-id={event.id}
                    onClick={() => navigate('/community/meetups')}
                    utilityTopRight={
                      isMock ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/community/meetups');
                          }}
                        >
                          Join Event
                        </Button>
                      ) : isOwnProfile && isUpcoming ? (
                        <Button
                          size="xs"
                          variant="soft"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/community/meetups');
                          }}
                          aria-label="Edit event"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
          
          {/* Explore More Events Button */}
          {createdEvents.length > 0 && (
            <div className="flex justify-center pt-8 pb-4">
              <Button 
                variant="outline" 
                className="rounded-full px-8 py-6 text-base font-medium group"
                onClick={() => navigate('/community/meetups')}
              >
                {t('screens.profile.exploreMoreEvents')}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="joined" className="mt-0">
          {joinedEvents.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/30 mb-5">
                <Users className="w-8 h-8 text-primary/60" />
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {isOwnProfile ? "You haven't joined any events yet — discover gatherings that inspire you! 🌟" : "No events joined"}
              </p>
              {isOwnProfile && (
                <Button 
                  variant="solid"
                  onClick={() => navigate('/community/meetups')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('screens.profile.browseEvents')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {joinedEvents.map((event) => {
                const isMock = event.id.startsWith('mock-');
                
                return (
                  <NewsCard
                    key={event.id}
                    title={event.title}
                    description={event.description}
                    imageUrl={getEventImageUrl(event)}
                    category="event"
                    pillar={eventTypeToPillar(event.event_type)}
                    author={{
                      name: profile.name || "Community",
                      avatar: profile.avatarUrl
                    }}
                    location={event.location || "Virtual"}
                    attendees={event.participant_count}
                    timestamp={formatTimestamp(event.start_time)}
                    className="min-h-[320px] md:min-h-[360px]"
                    showSmartAction={!isMock}
                    eventId={isMock ? undefined : event.id}
                    data-event-id={event.id}
                    onClick={() => navigate('/community/meetups')}
                    utilityTopRight={
                      isMock ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/community/meetups');
                          }}
                        >
                          Join Event
                        </Button>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
          
          {/* Explore More Events Button */}
          {joinedEvents.length > 0 && (
            <div className="flex justify-center pt-8 pb-4">
              <Button 
                variant="outline" 
                className="rounded-full px-8 py-6 text-base font-medium group"
                onClick={() => navigate('/community/meetups')}
              >
                {t('screens.profile.exploreMoreEvents')}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}