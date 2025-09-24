import { useEffect, useState } from "react";
import { Search, Plus, Calendar } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MasterActionPopup } from "@/components/MasterActionPopup";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { NewsCard } from "@/components/crossover/NewsCard";
import SubNavigation from "@/components/SubNavigation";
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
    title: "Sleep Support Group",
    description: "Weekly community for better sleep habits",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "Sleep Therapist Anna", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Wellness Center",
    timestamp: "Thursdays"
  },
  {
    title: "Hydration Challenge Buddy",
    description: "Join our 30-day hydration accountability partner",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    pillar: "Hydration",
    author: { name: "Health Coach Murphy", avatar: "/lovable-uploads/murphy-avatar.jpg" },
    location: "Online",
    timestamp: "Daily Check-ins"
  }
];

export default function Home() {
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <StandardHeader
          title={greeting}
          description="Your wellness journey starts today."
          emoji={emoji}
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder="Search today's content, events, or media…"
            onSearch={(query) => console.log('Search:', query)}
          />
          <UniversalCalendarButton />
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
              {/* Row 1: Today Scheduled (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={todayScheduledEvents[0]?.title || ""}
                    description={todayScheduledEvents[0]?.description}
                    imageUrl={todayScheduledEvents[0]?.imageUrl || ""}
                    pillar={todayScheduledEvents[0]?.pillar}
                    author={todayScheduledEvents[0]?.author}
                    location={todayScheduledEvents[0]?.location}
                    attendees={todayScheduledEvents[0]?.attendees}
                    timestamp={todayScheduledEvents[0]?.timestamp}
                    showReward={true}
                    rewardPoints={5}
                    rewardDescription="Earn credits for attending"
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todayScheduledEvents[1]?.title || ""}
                    description={todayScheduledEvents[1]?.description}
                    imageUrl={todayScheduledEvents[1]?.imageUrl || ""}
                    pillar={todayScheduledEvents[1]?.pillar}
                    author={todayScheduledEvents[1]?.author}
                    location={todayScheduledEvents[1]?.location}
                    attendees={todayScheduledEvents[1]?.attendees}
                    timestamp={todayScheduledEvents[1]?.timestamp}
                    showReward={true}
                    rewardPoints={4}
                    rewardDescription="Earn credits for learning"
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todayScheduledEvents[2]?.title || ""}
                    description={todayScheduledEvents[2]?.description}
                    imageUrl={todayScheduledEvents[2]?.imageUrl || ""}
                    pillar={todayScheduledEvents[2]?.pillar}
                    author={todayScheduledEvents[2]?.author}
                    location={todayScheduledEvents[2]?.location}
                    attendees={todayScheduledEvents[2]?.attendees}
                    timestamp={todayScheduledEvents[2]?.timestamp}
                    showReward={true}
                    rewardPoints={8}
                    rewardDescription="Earn credits for group participation"
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="encouragement" />

              {/* Row 2: Media Content (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={todayMediaContent[0]?.title || ""}
                    description={todayMediaContent[0]?.description}
                    imageUrl={todayMediaContent[0]?.imageUrl || ""}
                    pillar={todayMediaContent[0]?.pillar}
                    mediaType={todayMediaContent[0]?.mediaType}
                    author={todayMediaContent[0]?.author}
                    timestamp={todayMediaContent[0]?.timestamp}
                    showReward={true}
                    rewardPoints={3}
                    rewardDescription="Earn credits for completing meditation"
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todayMediaContent[1]?.title || ""}
                    description={todayMediaContent[1]?.description}
                    imageUrl={todayMediaContent[1]?.imageUrl || ""}
                    pillar={todayMediaContent[1]?.pillar}
                    mediaType={todayMediaContent[1]?.mediaType}
                    author={todayMediaContent[1]?.author}
                    timestamp={todayMediaContent[1]?.timestamp}
                    showReward={true}
                    rewardPoints={2}
                    rewardDescription="Earn credits for workout playlist"
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={todayMediaContent[2]?.title || ""}
                    description={todayMediaContent[2]?.description}
                    imageUrl={todayMediaContent[2]?.imageUrl || ""}
                    pillar={todayMediaContent[2]?.pillar}
                    mediaType={todayMediaContent[2]?.mediaType}
                    author={todayMediaContent[2]?.author}
                    timestamp={todayMediaContent[2]?.timestamp}
                    showReward={true}
                    rewardPoints={4}
                    rewardDescription="Earn credits for cooking tutorial"
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="partnership" />

              {/* Row 3: Events & Meetups (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={todayEventsAndMeetups[0]?.title || ""}
                    description={todayEventsAndMeetups[0]?.description}
                    imageUrl={todayEventsAndMeetups[0]?.imageUrl || ""}
                    pillar={todayEventsAndMeetups[0]?.pillar}
                    author={todayEventsAndMeetups[0]?.author}
                    location={todayEventsAndMeetups[0]?.location}
                    attendees={todayEventsAndMeetups[0]?.attendees}
                    timestamp={todayEventsAndMeetups[0]?.timestamp}
                    showReward={true}
                    rewardPoints={8}
                    rewardDescription="Earn credits for joining meetup"
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todayEventsAndMeetups[1]?.title || ""}
                    description={todayEventsAndMeetups[1]?.description}
                    imageUrl={todayEventsAndMeetups[1]?.imageUrl || ""}
                    pillar={todayEventsAndMeetups[1]?.pillar}
                    author={todayEventsAndMeetups[1]?.author}
                    location={todayEventsAndMeetups[1]?.location}
                    attendees={todayEventsAndMeetups[1]?.attendees}
                    timestamp={todayEventsAndMeetups[1]?.timestamp}
                    showReward={true}
                    rewardPoints={6}
                    rewardDescription="Earn credits for hydration challenge"
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todayEventsAndMeetups[2]?.title || ""}
                    description={todayEventsAndMeetups[2]?.description}
                    imageUrl={todayEventsAndMeetups[2]?.imageUrl || ""}
                    pillar={todayEventsAndMeetups[2]?.pillar}
                    author={todayEventsAndMeetups[2]?.author}
                    location={todayEventsAndMeetups[2]?.location}
                    attendees={todayEventsAndMeetups[2]?.attendees}
                    timestamp={todayEventsAndMeetups[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="guidance" />

              {/* Row 4: Community News (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={todayNews[0]?.title || ""}
                    description={todayNews[0]?.description}
                    imageUrl={todayNews[0]?.imageUrl || ""}
                    pillar={todayNews[0]?.pillar}
                    author={todayNews[0]?.author}
                    timestamp={todayNews[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todayNews[1]?.title || ""}
                    description={todayNews[1]?.description}
                    imageUrl={todayNews[1]?.imageUrl || ""}
                    pillar={todayNews[1]?.pillar}
                    author={todayNews[1]?.author}
                    location={todayNews[1]?.location}
                    attendees={todayNews[1]?.attendees}
                    timestamp={todayNews[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={todayNews[2]?.title || ""}
                    description={todayNews[2]?.description}
                    imageUrl={todayNews[2]?.imageUrl || ""}
                    pillar={todayNews[2]?.pillar}
                    author={todayNews[2]?.author}
                    timestamp={todayNews[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="guide">
            <div className="mt-6">
              {/* Row 1: Inspirational Events - first 3 (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={guideInspirationalEvents[0]?.title || ""}
                    description={guideInspirationalEvents[0]?.description}
                    imageUrl={guideInspirationalEvents[0]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[0]?.pillar}
                    author={guideInspirationalEvents[0]?.author}
                    location={guideInspirationalEvents[0]?.location}
                    attendees={guideInspirationalEvents[0]?.attendees}
                    timestamp={guideInspirationalEvents[0]?.timestamp}
                    price={guideInspirationalEvents[0]?.price}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[1]?.title || ""}
                    description={guideInspirationalEvents[1]?.description}
                    imageUrl={guideInspirationalEvents[1]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[1]?.pillar}
                    author={guideInspirationalEvents[1]?.author}
                    location={guideInspirationalEvents[1]?.location}
                    attendees={guideInspirationalEvents[1]?.attendees}
                    timestamp={guideInspirationalEvents[1]?.timestamp}
                    price={guideInspirationalEvents[1]?.price}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[2]?.title || ""}
                    description={guideInspirationalEvents[2]?.description}
                    imageUrl={guideInspirationalEvents[2]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[2]?.pillar}
                    author={guideInspirationalEvents[2]?.author}
                    location={guideInspirationalEvents[2]?.location}
                    attendees={guideInspirationalEvents[2]?.attendees}
                    timestamp={guideInspirationalEvents[2]?.timestamp}
                    price={guideInspirationalEvents[2]?.price}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="achievement" />

              {/* Row 2: Remaining Inspirational Event + first 2 Daily Matches (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[3]?.title || ""}
                    description={guideInspirationalEvents[3]?.description}
                    imageUrl={guideInspirationalEvents[3]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[3]?.pillar}
                    author={guideInspirationalEvents[3]?.author}
                    location={guideInspirationalEvents[3]?.location}
                    attendees={guideInspirationalEvents[3]?.attendees}
                    timestamp={guideInspirationalEvents[3]?.timestamp}
                    price={guideInspirationalEvents[3]?.price}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideDailyMatches[0]?.title || ""}
                    description={guideDailyMatches[0]?.description}
                    imageUrl={guideDailyMatches[0]?.imageUrl || ""}
                    pillar={guideDailyMatches[0]?.pillar}
                    author={guideDailyMatches[0]?.author}
                    location={guideDailyMatches[0]?.location}
                    timestamp={guideDailyMatches[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={guideDailyMatches[1]?.title || ""}
                    description={guideDailyMatches[1]?.description}
                    imageUrl={guideDailyMatches[1]?.imageUrl || ""}
                    pillar={guideDailyMatches[1]?.pillar}
                    author={guideDailyMatches[1]?.author}
                    location={guideDailyMatches[1]?.location}
                    timestamp={guideDailyMatches[1]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="guidance" />

              {/* Row 3: Remaining Daily Matches (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={guideDailyMatches[2]?.title || ""}
                    description={guideDailyMatches[2]?.description}
                    imageUrl={guideDailyMatches[2]?.imageUrl || ""}
                    pillar={guideDailyMatches[2]?.pillar}
                    author={guideDailyMatches[2]?.author}
                    location={guideDailyMatches[2]?.location}
                    timestamp={guideDailyMatches[2]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideDailyMatches[3]?.title || ""}
                    description={guideDailyMatches[3]?.description}
                    imageUrl={guideDailyMatches[3]?.imageUrl || ""}
                    pillar={guideDailyMatches[3]?.pillar}
                    author={guideDailyMatches[3]?.author}
                    location={guideDailyMatches[3]?.location}
                    timestamp={guideDailyMatches[3]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideDailyMatches[4]?.title || ""}
                    description={guideDailyMatches[4]?.description}
                    imageUrl={guideDailyMatches[4]?.imageUrl || ""}
                    pillar={guideDailyMatches[4]?.pillar}
                    author={guideDailyMatches[4]?.author}
                    location={guideDailyMatches[4]?.location}
                    timestamp={guideDailyMatches[4]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="partnership" />

              {/* Row 4: Meetup Discovery - reusing inspirational events (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[0]?.title || ""}
                    description={guideInspirationalEvents[0]?.description}
                    imageUrl={guideInspirationalEvents[0]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[0]?.pillar}
                    author={guideInspirationalEvents[0]?.author}
                    location={guideInspirationalEvents[0]?.location}
                    attendees={guideInspirationalEvents[0]?.attendees}
                    timestamp={guideInspirationalEvents[0]?.timestamp}
                    price={guideInspirationalEvents[0]?.price}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[1]?.title || ""}
                    description={guideInspirationalEvents[1]?.description}
                    imageUrl={guideInspirationalEvents[1]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[1]?.pillar}
                    author={guideInspirationalEvents[1]?.author}
                    location={guideInspirationalEvents[1]?.location}
                    attendees={guideInspirationalEvents[1]?.attendees}
                    timestamp={guideInspirationalEvents[1]?.timestamp}
                    price={guideInspirationalEvents[1]?.price}
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={guideInspirationalEvents[2]?.title || ""}
                    description={guideInspirationalEvents[2]?.description}
                    imageUrl={guideInspirationalEvents[2]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[2]?.pillar}
                    author={guideInspirationalEvents[2]?.author}
                    location={guideInspirationalEvents[2]?.location}
                    attendees={guideInspirationalEvents[2]?.attendees}
                    timestamp={guideInspirationalEvents[2]?.timestamp}
                    price={guideInspirationalEvents[2]?.price}
                    className="h-full"
                  />
                </div>
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
      </div>
    </AppLayout>
  );
}