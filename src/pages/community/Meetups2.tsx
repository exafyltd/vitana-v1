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

export default withScreenId(function Meetups() {
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const { events, todayEvents, upcomingEvents, loading, searchEvents } = useCommunityEvents();

  const formatEventTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
  };

  const renderEventCard = (event: any) => (
    <Card key={event.id} className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold line-clamp-2">{event.title}</h3>
          <div className="text-sm text-muted-foreground bg-primary/10 px-2 py-1 rounded-full">
            Meetup
          </div>
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

  const renderEventsSection = (title: string, events: any[], emptyMessage: string) => {
    if (events.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(renderEventCard)}
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
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No meetups yet</h3>
            <p className="text-muted-foreground">Create your first meetup to bring the community together!</p>
          </div>
        ) : (
          <div className="space-y-8 mt-6">
            {todayEvents.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Today's Meetups</h2>
                {renderEventsSection("Today", todayEvents, "No meetups scheduled for today")}
              </div>
            )}
            
            {upcomingEvents.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Upcoming Meetups</h2>
                {renderEventsSection("Upcoming", upcomingEvents, "No upcoming meetups")}
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