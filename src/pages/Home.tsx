import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { NewsCard } from "@/components/crossover/NewsCard";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { MasterActionPopup } from "@/components/MasterActionPopup";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import { useProfile } from "@/context/ProfileProvider";
import { useEnhancedMotivationalMessage } from "@/hooks/useEnhancedMotivationalMessage";

import { homeNavigation } from "@/config/navigation";

// Mock data for Today and Guide screens
const todayScheduledEvents = [
  {
    title: "Morning Yoga with Lisa Chen",
    description: "Start your day with energy and mindfulness",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Studio A",
    attendees: 15,
    timestamp: "8:00 AM"
  },
  {
    title: "Nutrition Workshop Today",
    description: "Learn meal prep strategies for busy professionals",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Mike Thompson", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Kitchen Lab",
    attendees: 12,
    timestamp: "2:00 PM"
  },
  {
    title: "Community Fitness Challenge",
    description: "Join the weekly group fitness challenge",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "James Davis", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Fitness Center",
    attendees: 25,
    timestamp: "6:00 PM"
  }
];

const todayMediaContent = [
  {
    title: "Meditation Podcast: Finding Inner Peace",
    description: "A guided meditation session for stress relief",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    pillar: "Mental",
    mediaType: "podcast" as const,
    author: { name: "Dr. Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    timestamp: "New Episode"
  },
  {
    title: "Energizing Music Playlist",
    description: "Upbeat tracks to fuel your workout",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    pillar: "Exercise",
    mediaType: "music" as const,
    author: { name: "VITANA Music", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Updated"
  },
  {
    title: "Cooking Video: Healthy Smoothies",
    description: "5 nutritious smoothie recipes in 5 minutes",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    mediaType: "video" as const,
    author: { name: "Chef Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    timestamp: "15 min"
  }
];

const todayEventsAndMeetups = [
  {
    title: "Evening Wellness Meetup",
    description: "Connect with like-minded wellness enthusiasts",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Dr. Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Downtown Center",
    attendees: 52,
    timestamp: "7:00 PM"
  },
  {
    title: "Hydration Challenge Kickoff",
    description: "Start the 30-day community hydration challenge",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    pillar: "Hydration",
    author: { name: "Health Coach Murphy", avatar: "/lovable-uploads/murphy-avatar.jpg" },
    location: "Wellness Center",
    attendees: 75,
    timestamp: "6:00 PM"
  },
  {
    title: "Sleep Workshop Tonight",
    description: "Learn strategies for better sleep quality",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "Sleep Therapist James", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Therapy Center",
    attendees: 18,
    timestamp: "8:00 PM"
  }
];

const todayNews = [
  {
    title: "Emma Wilson's Wellness Transformation",
    description: "Inspiring 30-day journey with incredible results",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Emma Wilson", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    timestamp: "2 hours ago"
  },
  {
    title: "Community Health Fair Success",
    description: "200+ members joined this weekend's wellness fair",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    pillar: "Hydration",
    author: { name: "VITANA Community", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Central Park",
    attendees: 200,
    timestamp: "Yesterday"
  },
  {
    title: "New Sleep Tracking Features",
    description: "Enhanced analytics for better sleep insights",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "VITANA Team", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "3 hours ago"
  }
];

const guideInspirationalEvents = [
  {
    title: "Transform Your Life Weekend Retreat",
    description: "3-day intensive wellness transformation program",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Wellness Masters", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Mountain Retreat",
    attendees: 50,
    timestamp: "Next Month",
    price: 299
  },
  {
    title: "Elite Fitness Challenge 2024",
    description: "Push your limits with professional athletes",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "Elite Trainers", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Olympic Center",
    attendees: 100,
    timestamp: "Registration Open",
    price: 199
  },
  {
    title: "Mindfulness Mastery Workshop",
    description: "Advanced meditation and mindfulness techniques",
    imageUrl: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Mindfulness Experts", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Zen Center",
    attendees: 30,
    timestamp: "Limited Spots",
    price: 149
  },
  {
    title: "Nutrition Certification Program",
    description: "Become a certified wellness nutrition consultant",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Nutrition Institute", avatar: "/lovable-uploads/se-hun-oh-avatar.jpg" },
    location: "Learning Center",
    attendees: 25,
    timestamp: "6-Week Program",
    price: 599
  }
];

const guideDailyMatches = [
  {
    title: "Connect with Dr. Sarah Miller",
    description: "Mental health expert - Available for mentorship",
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Dr. Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Virtual",
    timestamp: "Available Now"
  },
  {
    title: "Workout Partner: James Davis",
    description: "Marathon runner seeking training companion",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "James Davis", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "City Park",
    timestamp: "Mornings"
  },
  {
    title: "Cooking Buddy: Chef Tae Min",
    description: "Learn Korean healthy cooking techniques",
    imageUrl: "https://images.unsplash.com/photo-1556908114-4bfca461d0c6?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Tae Min", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Culinary Studio",
    timestamp: "Weekends"
  },
  {
    title: "Accountability Partner: Murphy",
    description: "Health coach for goal setting and motivation",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Murphy", avatar: "/lovable-uploads/murphy-avatar.jpg" },
    location: "Virtual/In-Person",
    timestamp: "Flexible"
  }
];

const renderCardGrid = (cards: any[], rowSize: number = 3) => {
  const rows = [];
  
  for (let i = 0; i < cards.length; i += rowSize) {
    const rowCards = cards.slice(i, i + rowSize);
    const isEvenRow = Math.floor(i / rowSize) % 2 === 0;
    
    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          // Row pattern: big + small + small
          <>
            <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                title={rowCards[0]?.title || ""}
                description={rowCards[0]?.description}
                imageUrl={rowCards[0]?.imageUrl || ""}
                pillar={rowCards[0]?.pillar}
                author={rowCards[0]?.author}
                location={rowCards[0]?.location}
                attendees={rowCards[0]?.attendees}
                timestamp={rowCards[0]?.timestamp}
                price={rowCards[0]?.price}
                className="h-full"
              />
            </div>
            {rowCards[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  title={rowCards[1].title}
                  description={rowCards[1].description}
                  imageUrl={rowCards[1].imageUrl}
                  pillar={rowCards[1].pillar}
                  author={rowCards[1].author}
                  location={rowCards[1].location}
                  attendees={rowCards[1].attendees}
                  timestamp={rowCards[1].timestamp}
                  price={rowCards[1].price}
                  className="h-full"
                />
              </div>
            )}
            {rowCards[2] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-2`}
                  title={rowCards[2].title}
                  description={rowCards[2].description}
                  imageUrl={rowCards[2].imageUrl}
                  pillar={rowCards[2].pillar}
                  author={rowCards[2].author}
                  location={rowCards[2].location}
                  attendees={rowCards[2].attendees}
                  timestamp={rowCards[2].timestamp}
                  price={rowCards[2].price}
                  className="h-full"
                />
              </div>
            )}
          </>
        ) : (
          // Row pattern: small + small + big
          <>
            {rowCards[0] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-0`}
                  title={rowCards[0].title}
                  description={rowCards[0].description}
                  imageUrl={rowCards[0].imageUrl}
                  pillar={rowCards[0].pillar}
                  author={rowCards[0].author}
                  location={rowCards[0].location}
                  attendees={rowCards[0].attendees}
                  timestamp={rowCards[0].timestamp}
                  price={rowCards[0].price}
                  className="h-full"
                />
              </div>
            )}
            {rowCards[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  title={rowCards[1].title}
                  description={rowCards[1].description}
                  imageUrl={rowCards[1].imageUrl}
                  pillar={rowCards[1].pillar}
                  author={rowCards[1].author}
                  location={rowCards[1].location}
                  attendees={rowCards[1].attendees}
                  timestamp={rowCards[1].timestamp}
                  price={rowCards[1].price}
                  className="h-full"
                />
              </div>
            )}
            {rowCards[2] && (
              <div className="col-span-6">
                <NewsCard
                  key={`${i}-2`}
                  title={rowCards[2].title}
                  description={rowCards[2].description}
                  imageUrl={rowCards[2].imageUrl}
                  pillar={rowCards[2].pillar}
                  author={rowCards[2].author}
                  location={rowCards[2].location}
                  attendees={rowCards[2].attendees}
                  timestamp={rowCards[2].timestamp}
                  price={rowCards[2].price}
                  className="h-full"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  
  return <>{rows}</>;
};

export default function Home() {
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const { profile } = useProfile();
  
  const firstName = profile?.displayName?.split(' ')[0] || '';
  const { greeting, emoji } = useEnhancedMotivationalMessage(firstName);

  // Show onboarding for new users (check localStorage for demo)
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('vitana-onboarding-completed');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (open: boolean) => {
    if (!open) {
      localStorage.setItem('vitana-onboarding-completed', 'true');
    }
    setShowOnboarding(open);
  };

  return (
    <AppLayout>
      <SEO title="Home | VITANA" description="VITANA Home Dashboard - Your wellness journey starts here" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <div className="p-6">
        <StandardHeader
          title={greeting}
          description="Your wellness journey starts today."
          emoji={emoji}
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button size="sm" onClick={() => setMasterActionOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Action
          </Button>
        </UtilityActionButton>

        {/* Split Navigation */}
        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="today">Today</SplitBarTrigger>
            <SplitBarTrigger value="guide">Guide</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="today">
            <div className="mt-6">
              {/* Today Scheduled Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6 text-foreground">Today's Schedule</h2>
                {renderCardGrid(todayScheduledEvents)}
              </div>

              <MotivationalBanner variant="encouragement" />

              {/* Media Content Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6 text-foreground">Media & Content</h2>
                {renderCardGrid(todayMediaContent)}
              </div>

              <MotivationalBanner variant="partnership" />

              {/* Events & Meetups Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6 text-foreground">Events & Meetups</h2>
                {renderCardGrid(todayEventsAndMeetups)}
              </div>

              <MotivationalBanner variant="guidance" />

              {/* News Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6 text-foreground">Community News</h2>
                {renderCardGrid(todayNews)}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="guide">
            <div className="mt-6">
              {/* Inspirational Events Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6 text-foreground">Inspirational Events</h2>
                {renderCardGrid(guideInspirationalEvents, 4)}
              </div>

              <MotivationalBanner variant="achievement" />

              {/* Meetup Discovery Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6 text-foreground">Discover Meetups</h2>
                {renderCardGrid(guideInspirationalEvents, 4)} {/* Reusing for now */}
              </div>

              <MotivationalBanner variant="guidance" />

              {/* Daily Matches Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6 text-foreground">Daily Matches</h2>
                {renderCardGrid(guideDailyMatches, 4)}
              </div>
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>
      
      {/* Master Action Popup */}
      <MasterActionPopup 
        open={masterActionOpen} 
        onOpenChange={setMasterActionOpen}
      />
      
      {/* Onboarding Overlay */}
      <OnboardingOverlay 
        open={showOnboarding}
        onOpenChange={handleOnboardingComplete}
      />
    </AppLayout>
  );
}