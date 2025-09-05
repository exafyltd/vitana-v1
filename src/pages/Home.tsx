import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { AutoPilotActionCard } from "@/components/crossover/AutoPilotActionCard";
import { LifestylePlanCard } from "@/components/crossover/LifestylePlanCard";
import { QuickLogStrip } from "@/components/crossover/QuickLogStrip";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { CommunityPulseCard } from "@/components/crossover/CommunityPulseCard";
import { ProgressStreaksCard } from "@/components/crossover/ProgressStreaksCard";
import { DataWalletCard } from "@/components/crossover/DataWalletCard";
import { DiscoverPicksCard } from "@/components/crossover/DiscoverPicksCard";
import { MotivationCard } from "@/components/crossover/MotivationCard";
import { PodcastCard } from "@/components/crossover/PodcastCard";
import { MusicCard } from "@/components/crossover/MusicCard";
import { VideoFeedCard } from "@/components/crossover/VideoFeedCard";
import { NewsCard } from "@/components/crossover/NewsCard";
import { useNavigate } from "react-router-dom";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState, useEffect } from "react";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import { useProfile } from "@/context/ProfileProvider";
import { useMotivationalMessage } from "@/hooks/useMotivationalMessage";
import StandardHeader from "@/components/StandardHeader";

import { homeNavigation } from "@/config/navigation";

export default function Home() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { profile } = useProfile();
  
  const firstName = profile?.displayName?.split(' ')[0] || '';
  const { greeting, emoji } = useMotivationalMessage(firstName);

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
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="Home | VITANA" description="VITANA Home" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <StandardHeader 
              title={greeting}
              description="Your wellness journey starts with today's opportunities."
              emoji={emoji}
            />
          </div>

        {/* Pinterest-style Masonry Grid Layout with News Cards Mixed In */}
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {/* Large cards */}
          <div className="break-inside-avoid mb-4">
            <VitanaIndexCard />
          </div>
          
          {/* News Card - Community Event */}
          <div className="break-inside-avoid mb-4">
            <NewsCard 
              title="Weekly Wellness Meetup Tonight"
              description="Join Dr. Sarah Miller and 50+ community members for meditation and healthy cooking tips"
              imageUrl="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&crop=center"
              category="community"
              author={{
                name: "Dr. Sarah Miller",
                avatar: "/lovable-uploads/sarah-miller-avatar.jpg"
              }}
              location="Downtown Center"
              attendees={52}
              timestamp="7:00 PM"
              onClick={() => navigate("/community/events")}
            />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <AutoPilotActionCard />
          </div>
          
          {/* Quick Health Logging - Positioned after main cards */}
          <div className="break-inside-avoid mb-4">
            <QuickLogStrip />
          </div>
          
          {/* News Card - Achievement */}
          <div className="break-inside-avoid mb-4">
            <NewsCard 
              title="Emma Wilson Completes 30-Day Challenge"
              description="Inspiring transformation journey with consistent nutrition tracking and community support"
              imageUrl="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center"
              category="achievement"
              author={{
                name: "Emma Wilson",
                avatar: "/lovable-uploads/emma-wilson-avatar.jpg"
              }}
              timestamp="2 hours ago"
              onClick={() => navigate("/community/feed")}
            />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <SmartCalendarCard />
          </div>
          
          {/* Health Pillars mixed with Media Cards */}
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="nutrition" />
          </div>
          
          {/* News Card - Wellness Event */}
          <div className="break-inside-avoid mb-4">
            <NewsCard 
              title="Live Yoga Session with Lisa Chen"
              description="Morning flow for energy and mindfulness - perfect for busy professionals"
              imageUrl="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop&crop=center"
              category="wellness"
              author={{
                name: "Lisa Chen",
                avatar: "/lovable-uploads/lisa-chen-avatar.jpg"
              }}
              location="Virtual"
              attendees={28}
              timestamp="Tomorrow 8 AM"
              onClick={() => navigate("/calendar/events")}
            />
          </div>
          
          {/* Podcast Card - Medium size */}
          <div className="break-inside-avoid mb-4" style={{ height: 'auto' }}>
            <PodcastCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="hydration" />
          </div>
          
          {/* News Card - Community Achievement */}
          <div className="break-inside-avoid mb-4">
            <NewsCard 
              title="James Davis Reaches Fitness Milestone"
              description="Completed his first marathon and raised $5000 for mental health awareness"
              imageUrl="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center"
              category="achievement"
              author={{
                name: "James Davis",
                avatar: "/lovable-uploads/james-davis-avatar.jpg"
              }}
              location="City Marathon"
              timestamp="Yesterday"
              onClick={() => navigate("/community/feed")}
            />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="exercise" />
          </div>

          {/* Music Card - Small size */}
          <div className="break-inside-avoid mb-4" style={{ height: 'auto', minHeight: '200px' }}>
            <MusicCard />
          </div>
          
          {/* News Card - Wellness Workshop */}
          <div className="break-inside-avoid mb-4">
            <NewsCard 
              title="Nutrition Workshop: Meal Prep Mastery"
              description="Learn from certified nutritionist Mike Thompson about sustainable meal planning"
              imageUrl="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop&crop=center"
              category="wellness"
              author={{
                name: "Mike Thompson",
                avatar: "/lovable-uploads/mike-thompson-avatar.jpg"
              }}
              location="Wellness Center"
              attendees={15}
              timestamp="This Saturday"
              onClick={() => navigate("/discover/wellness-services")}
            />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="sleep" />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="mental" />
          </div>
          
          {/* Video Card - Large size */}
          <div className="break-inside-avoid mb-4" style={{ height: 'auto', minHeight: '350px' }}>
            <VideoFeedCard />
          </div>
          
          {/* News Card - Community Event */}
          <div className="break-inside-avoid mb-4">
            <NewsCard 
              title="Monthly Health & Wellness Fair"
              description="Meet local practitioners, try new wellness services, and connect with your community"
              imageUrl="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&crop=center"
              category="event"
              author={{
                name: "VITANA Community",
              }}
              location="Central Park"
              attendees={200}
              timestamp="Next Weekend"
              onClick={() => navigate("/community/events")}
            />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <CommunityPulseCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <ProgressStreaksCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <DataWalletCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <DiscoverPicksCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <MotivationCard />
          </div>
        </div>

        </div>
      </div>
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
      
      {/* Onboarding Overlay */}
      <OnboardingOverlay 
        open={showOnboarding}
        onOpenChange={handleOnboardingComplete}
      />
    </AppLayout>
  );
}