import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { CreateMeetupPopup } from '@/components/CreateMeetupPopup';
import { useCommunityEvents } from '@/hooks/useCommunityEvents';
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { NewsCard } from '@/components/crossover/NewsCard';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import { useState } from "react";
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  Users, 
  Search, 
  Calendar,
  Plus,
  Heart,
  Activity,
  BookOpen
} from 'lucide-react';

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
    imageUrl: "/api/placeholder/600/400?text=Morning+Yoga",
    author: { name: "Wellness Community", avatar: "/api/placeholder/32/32" },
    category: "wellness"
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
    imageUrl: "/api/placeholder/600/400?text=Cooking+Workshop",
    author: { name: "Chef Maria", avatar: "/api/placeholder/32/32" },
    category: "wellness"
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
    imageUrl: "/api/placeholder/600/400?text=HIIT+Bootcamp",
    author: { name: "FitLife Trainers", avatar: "/api/placeholder/32/32" },
    category: "fitness"
  },
  {
    id: "dummy-today-4",
    title: "Lunchtime Stretch & Mobility", 
    description: "Quick full-body mobility routine to boost your afternoon energy",
    start_time: new Date().toISOString(),
    location: "Wellness Studio",
    participant_count: 10,
    max_participants: 20,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Exercise",
    author: { name: "FitLife Trainers", avatar: "/api/placeholder/32/32" },
    category: "fitness"
  },
  {
    id: "dummy-today-5",
    title: "Mindful Nature Walk", 
    description: "Slow paced mindful walk focusing on breath and senses",
    start_time: new Date().toISOString(),
    location: "Riverside Park",
    participant_count: 18,
    max_participants: 25,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Mental",
    author: { name: "Nature Explorers", avatar: "/api/placeholder/32/32" },
    category: "wellness"
  },
  {
    id: "dummy-today-6",
    title: "Evening Community Run", 
    description: "5K community run for all levels with pacers",
    start_time: new Date().toISOString(),
    location: "City Track",
    participant_count: 22,
    max_participants: 40,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Exercise",
    author: { name: "Run Together", avatar: "/api/placeholder/32/32" },
    category: "fitness"
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
    imageUrl: "/api/placeholder/600/400?text=Hiking+Adventure",
    author: { name: "Nature Explorers", avatar: "/api/placeholder/32/32" },
    category: "outdoor"
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
    imageUrl: "/api/placeholder/600/400?text=Stress+Management",
    author: { name: "Dr. Sarah Wilson", avatar: "/api/placeholder/32/32" },
    category: "wellness"
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
    imageUrl: "/api/placeholder/600/400?text=Plant+Based+Cooking",
    author: { name: "Green Kitchen Academy", avatar: "/api/placeholder/32/32" },
    category: "wellness"
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
    imageUrl: "/api/placeholder/600/400?text=Sleep+Hygiene",
    author: { name: "Sleep Wellness Center", avatar: "/api/placeholder/32/32" },
    category: "wellness"
  }
];

// Transform event data to NewsCard format
const transformEventToNewsCard = (event: any) => ({
  title: event.title,
  description: event.description,
  imageUrl: ((event.image_url && !String(event.image_url).includes('/api/placeholder')) ? event.image_url : undefined) ||
            ((event.imageUrl && !String(event.imageUrl).includes('/api/placeholder')) ? event.imageUrl : undefined) ||
            generateImageUrl(event.title, event.description),
  category: event.category || "community",
  pillar: event.category || "community",  
  author: event.author || {
    name: event.organizer_name || "Community",
    avatar: "https://placehold.co/32x32"
  },
  location: event.location || "TBA",
  attendees: event.participant_count || 0,
  timestamp: formatEventTime(event.start_time)
});

// Generate contextual image based on meetup content
const generateImageUrl = (title: string, description: string) => {
  const text = `${title} ${description || ''}`.toLowerCase();
  const build = (t: string) => `https://placehold.co/1200x800?text=${encodeURIComponent(t)}`;
  
  if (text.includes('yoga') || text.includes('meditation') || text.includes('mindfulness')) {
    return build('Yoga & Meditation');
  }
  if (text.includes('cooking') || text.includes('nutrition') || text.includes('food') || text.includes('recipe')) {
    return build('Healthy Cooking');
  }
  if (text.includes('hiking') || text.includes('outdoor') || text.includes('nature') || text.includes('trail')) {
    return build('Outdoor Adventure');
  }
  if (text.includes('fitness') || text.includes('workout') || text.includes('exercise') || text.includes('hiit')) {
    return build('Fitness Training');
  }
  if (text.includes('stress') || text.includes('mental') || text.includes('therapy') || text.includes('wellness')) {
    return build('Mental Wellness');
  }
  if (text.includes('sleep') || text.includes('rest') || text.includes('recovery')) {
    return build('Sleep & Recovery');  
  }
  if (text.includes('social') || text.includes('networking') || text.includes('community')) {
    return build('Community Social');
  }
  
  // Default community meetup image
  return build('Community Meetup');
};

const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
};

const renderEventGrid = (events: any[]) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No meetups scheduled</h3>
        <p className="text-muted-foreground">Create your first meetup to bring the community together!</p>
      </div>
    );
  }

  const rows = [];
  
  // Group events into rows of 3 using CTO-approved patterns
  for (let i = 0; i < events.length; i += 3) {
    const rowEvents = events.slice(i, i + 3);
    const isEvenRow = Math.floor(i / 3) % 2 === 0;
    
    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          // Row pattern: big + small + small
          <>
            <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                {...transformEventToNewsCard(rowEvents[0])}
                className="h-full"
              />
            </div>
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  {...transformEventToNewsCard(rowEvents[1])}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-2`}
                  {...transformEventToNewsCard(rowEvents[2])}
                  className="h-full"
                />
              </div>
            )}
          </>
        ) : (
          // Row pattern: small + small + big
          <>
            {rowEvents[0] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-0`}
                  {...transformEventToNewsCard(rowEvents[0])}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  {...transformEventToNewsCard(rowEvents[1])}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-6">
                <NewsCard
                  key={`${i}-2`}
                  {...transformEventToNewsCard(rowEvents[2])}
                  className="h-full"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  
  return <div className="px-6">{rows}</div>;
};

const Meetups = () => {
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const { 
    events,
    todayEvents,
    upcomingEvents,
    loading,
    searchQuery,
    searchEvents
  } = useCommunityEvents();

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
          <SplitBar defaultValue="today" className="mt-6">
            <SplitBarList className="grid w-full grid-cols-2">
              <SplitBarTrigger value="today">Today</SplitBarTrigger>
              <SplitBarTrigger value="upcoming">Upcoming</SplitBarTrigger>
            </SplitBarList>
            <SplitBarContent value="today" className="mt-6">
              {renderEventGrid([...todayEvents, ...featuredTodayEvents])}
            </SplitBarContent>
            <SplitBarContent value="upcoming" className="mt-6">
              {renderEventGrid([...upcomingEvents, ...featuredUpcomingEvents])}
            </SplitBarContent>
          </SplitBar>
        )}
      </div>

      {/* Create Meetup Popup */}
      <CreateMeetupPopup 
        isOpen={createMeetupOpen} 
        onClose={() => setCreateMeetupOpen(false)}
      />
    </AppLayout>
  );
};

export default withScreenId(Meetups, SCREEN_IDS.COMMUNITY_MEETUPS);