import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Plus, Edit } from "lucide-react";
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

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isUpcoming = date > now;
    
    return {
      formatted: date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit', 
        minute: '2-digit'
      }),
      isUpcoming
    };
  };

  const EventCard = ({ event, showEditButton = false }: { event: CommunityEvent; showEditButton?: boolean }) => {
    const { formatted, isUpcoming } = formatEventTime(event.start_time);
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-medium text-sm line-clamp-2">{event.title}</h4>
            <div className="flex items-center gap-2 ml-2">
              <Badge 
                variant={isUpcoming ? "default" : "secondary"}
                className="text-xs whitespace-nowrap"
              >
                {isUpcoming ? "Upcoming" : "Past"}
              </Badge>
              {showEditButton && isUpcoming && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/community/meetups');
                  }}
                >
                  <Edit className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          
          {event.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {event.description}
            </p>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatted}
            </div>
            
            {event.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {event.participant_count} {event.participant_count === 1 ? 'participant' : 'participants'}
              </div>
              
              <Badge variant="outline" className="text-xs">
                {event.event_type}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasAnyEvents = createdEvents.length > 0 || joinedEvents.length > 0;

  if (!hasAnyEvents) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">
          {isOwnProfile ? "No events yet" : `${profile.name?.split(' ')[0]} hasn't joined any events`}
        </h3>
        <p className="text-muted-foreground mb-6">
          {isOwnProfile 
            ? "Start by creating or joining community events to connect with others"
            : "Check back later for event activity"
          }
        </p>
        {isOwnProfile && (
          <Button onClick={() => navigate('/community/meetups')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Tabs defaultValue="created" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="created">
            Created ({createdEvents.length})
          </TabsTrigger>
          <TabsTrigger value="joined">
            Joined ({joinedEvents.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="created" className="space-y-4 mt-6">
          {createdEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {isOwnProfile ? "You haven't created any events yet" : "No events created"}
              </p>
              {isOwnProfile && (
                <Button 
                  size="sm" 
                  className="mt-4"
                  onClick={() => navigate('/community/meetups')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
        
        <TabsContent value="joined" className="space-y-4 mt-6">
          {joinedEvents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {isOwnProfile ? "You haven't joined any events yet" : "No events joined"}
              </p>
              {isOwnProfile && (
                <Button 
                  size="sm" 
                  className="mt-4"
                  onClick={() => navigate('/community/meetups')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Browse Events
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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