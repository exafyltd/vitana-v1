import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, Users, Plus, Edit, Sparkles, Heart, Coffee, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { useNavigate } from "react-router-dom";

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
}

export function ProfileEventsTab({ profile, scope, editMode, isOwnProfile }: ProfileEventsTabProps) {
  const [createdEvents, setCreatedEvents] = useState<CommunityEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!profile.id) return;
      
      try {
        // Fetch events created by user
        const { data: created, error: createdError } = await supabase
          .from('global_community_events')
          .select('*')
          .eq('created_by', profile.id)
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
              created_by
            )
          `)
          .eq('user_id', profile.id)
          .eq('status', 'attending');

        if (joinedError) throw joinedError;

        setCreatedEvents(created || []);
        setJoinedEvents(
          joinedData?.map(item => item.global_community_events).filter(Boolean) as CommunityEvent[] || []
        );
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [profile.id]);

  const getEventStatus = (startTime: string, endTime?: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;

    if (start > now) return { label: "Upcoming", color: "bg-emerald-500", emoji: "🟢" };
    if (end && end > now && start <= now) return { label: "Ongoing", color: "bg-sky-500", emoji: "🔵" };
    return { label: "Past", color: "bg-gray-400", emoji: "⚫" };
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, any> = {
      wellness: Heart,
      meetup: Coffee,
      fitness: Dumbbell,
    };
    return icons[type.toLowerCase()] || Sparkles;
  };

  const getEventGradient = (type: string) => {
    const gradients: Record<string, string> = {
      wellness: "from-violet-50 to-white dark:from-violet-950/30 dark:to-background",
      meetup: "from-amber-50 to-white dark:from-amber-950/30 dark:to-background",
      fitness: "from-teal-50 to-white dark:from-teal-950/30 dark:to-background",
    };
    return gradients[type.toLowerCase()] || "from-sky-50 to-white dark:from-sky-950/30 dark:to-background";
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    return {
      date: date.toLocaleDateString('en-GB', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      }),
      isUpcoming: date > now
    };
  };

  const EventCard = ({ event, showEditButton = false }: { event: CommunityEvent; showEditButton?: boolean }) => {
    const { date, time } = formatEventTime(event.start_time);
    const status = getEventStatus(event.start_time, event.end_time);
    const EventIcon = getEventIcon(event.event_type);
    const gradient = getEventGradient(event.event_type);
    
    return (
      <Card 
        className={`rounded-2xl bg-gradient-to-br ${gradient} border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] hover:translate-y-[-2px] motion-reduce:hover:translate-y-0 transition-all duration-300 overflow-hidden group cursor-pointer`}
        onClick={() => navigate('/community/meetups')}
      >
        {/* Header Icon Area */}
        <div className="relative h-24 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/5 dark:to-white/5 backdrop-blur-sm flex items-center justify-center border-b border-white/20">
          <EventIcon className="w-10 h-10 text-primary/40 group-hover:text-primary/60 transition-colors" />
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <Badge 
              className={`${status.color} text-white border-0 text-xs font-medium px-2.5 py-0.5 shadow-sm`}
            >
              <span className="mr-1">{status.emoji}</span>
              {status.label}
            </Badge>
          </div>

          {/* Edit Button */}
          {showEditButton && status.label === "Upcoming" && (
            <Button
              size="xs"
              variant="soft"
              className="absolute top-3 left-3"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/community/meetups');
              }}
              aria-label="Edit event"
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
        </div>

        <CardContent className="p-5">
          {/* Title */}
          <h4 className="font-semibold text-base leading-[1.75] tracking-wide text-gray-800 dark:text-gray-100 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h4>
          
          {/* Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          )}
          
          {/* Date/Time Row */}
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary/60" />
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary/60" />
              <span>{time}</span>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 text-primary/60" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Participants */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            <Users className="w-4 h-4 text-primary/60" />
            <span>{event.participant_count} {event.participant_count === 1 ? 'participant' : 'participants'}</span>
          </div>

          {/* Hosted By */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/20">
            <Avatar className="w-6 h-6">
              <AvatarImage src="" alt="Host" />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {profile.name?.charAt(0) || "H"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              Hosted by <span className="font-medium text-foreground">{profile.name || "Community"}</span>
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            {status.label === "Upcoming" ? (
              <Button 
                variant="solid" 
                size="sm" 
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/community/meetups');
                }}
              >
                Join Event
              </Button>
            ) : (
              <Button 
                variant="soft" 
                size="sm" 
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/community/meetups');
                }}
              >
                View Details
              </Button>
            )}
            <Badge variant="outline" className="text-xs px-2.5 py-1 capitalize">
              {event.event_type}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
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
            Create Event
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
                  Create Event
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {createdEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  showEditButton={isOwnProfile}
                />
              ))}
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
                  Browse Events
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {joinedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}