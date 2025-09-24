import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plus, Users, Search, Calendar, MapPin, Clock } from "lucide-react";
import { CreateMeetupPopup } from "@/components/CreateMeetupPopup";
import { useState } from "react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Apple, Droplets, Dumbbell, Brain, Moon } from "lucide-react";

// Featured dummy events for hybrid display
const featuredTodayEvents = [
  {
    id: "dummy-today-1",
    title: "Morning Yoga & Meditation",
    description: "Start your day with peaceful yoga and mindfulness meditation in the park",
    start_time: new Date().toISOString(),
    location: "Central Park",
    participant_count: 15,
    max_participants: 20,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Mental",
    icon: Brain
  },
  {
    id: "dummy-today-2", 
    title: "Healthy Cooking Workshop",
    description: "Learn to prepare nutritious meals with local organic ingredients",
    start_time: new Date().toISOString(),
    location: "Community Kitchen",
    participant_count: 12,
    max_participants: 15,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Nutrition",
    icon: Apple
  },
  {
    id: "dummy-today-3",
    title: "HIIT Fitness Bootcamp", 
    description: "High-intensity interval training session for all fitness levels",
    start_time: new Date().toISOString(),
    location: "Fitness Studio",
    participant_count: 20,
    max_participants: 25,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Exercise",
    icon: Dumbbell
  }
];

const featuredUpcomingEvents = [
  {
    id: "dummy-upcoming-1",
    title: "Weekend Hiking Adventure",
    description: "Explore local trails and connect with nature while getting great exercise",
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    location: "Mountain Trail",
    participant_count: 25,
    max_participants: 30,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Exercise",
    icon: Dumbbell
  },
  {
    id: "dummy-upcoming-2",
    title: "Stress Management Seminar",
    description: "Learn practical techniques for managing daily stress and anxiety",
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Therapy Center", 
    participant_count: 12,
    max_participants: 18,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Mental",
    icon: Brain
  },
  {
    id: "dummy-upcoming-3",
    title: "Plant-Based Cooking Class",
    description: "Master the art of delicious and nutritious plant-based meals",
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Culinary School",
    participant_count: 16, 
    max_participants: 20,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Nutrition",
    icon: Apple
  },
  {
    id: "dummy-upcoming-4",
    title: "Sleep Hygiene Bootcamp",
    description: "Transform your sleep routine with evidence-based techniques",
    start_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Sleep Lab",
    participant_count: 15,
    max_participants: 18,
    created_by: "dummy", 
    event_type: "meetup",
    pillar: "Sleep",
    icon: Moon
  }
];

export default withScreenId(function Meetups() {
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const { events, todayEvents, upcomingEvents, loading, searchEvents } = useCommunityEvents();

  const formatEventTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
  };

  const renderEventCard = (event: any, isRealEvent: boolean = true) => (
    <Card key={event.id} className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold line-clamp-2">{event.title}</h3>
          <Badge variant={isRealEvent ? "default" : "secondary"} className="text-xs">
            {isRealEvent ? "Community Meetup" : "Featured Event"}
          </Badge>
        </div>
        
        {event.description && (
          <p className="text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{formatEventTime(event.start_time)}</span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{event.location}</span>
            </div>
          )}
          
          {event.virtual_link && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Virtual Event</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>
              {event.participant_count} participant{event.participant_count !== 1 ? 's' : ''}
              {event.max_participants && ` / ${event.max_participants}`}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1">
            View Details
          </Button>
          <Button size="sm" className="flex-1">
            Join Meetup
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderEventsSection = (realEvents: any[], featuredEvents: any[], sectionTitle: string) => {
    const combinedEvents = [
      ...realEvents.map(event => ({ ...event, isReal: true })),
      ...featuredEvents.map(event => ({ ...event, isReal: false }))
    ];

    if (combinedEvents.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No meetups scheduled yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {realEvents.length > 0 && (
          <div>
            <h3 className="text-base font-medium text-muted-foreground mb-4">Community Created</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {realEvents.map(event => renderEventCard(event, true))}
            </div>
          </div>
        )}
        
        {featuredEvents.length > 0 && (
          <div>
            <h3 className="text-base font-medium text-muted-foreground mb-4">Featured Events</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map(event => renderEventCard(event, false))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <SEO title="Meetups | Community" description="Discover and join local meetups and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Meetups"
          description="Find and attend local wellness meetups and community events."
          emoji="🤝"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder="Search Meetups…"
            onSearch={searchEvents}
          />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setCreateMeetupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            MeetUp
          </Button>
        </UtilityActionButton>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meetups...</p>
          </div>
        ) : (
          <div className="space-y-8 mt-6">
            {(todayEvents.length > 0 || featuredTodayEvents.length > 0) && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Today's Meetups</h2>
                {renderEventsSection(todayEvents, featuredTodayEvents, "Today")}
              </div>
            )}
            
            {(upcomingEvents.length > 0 || featuredUpcomingEvents.length > 0) && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Upcoming Meetups</h2>
                {renderEventsSection(upcomingEvents, featuredUpcomingEvents, "Upcoming")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Meetup Popup */}
      <CreateMeetupPopup 
        isOpen={createMeetupOpen} 
        onClose={() => setCreateMeetupOpen(false)}
      />
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_MEETUPS);