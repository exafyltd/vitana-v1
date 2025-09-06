import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { AutoPilotActionCard } from "@/components/crossover/AutoPilotActionCard";
import { LifestylePlanCard } from "@/components/crossover/LifestylePlanCard";
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
      
      <div className="p-6 bg-gradient-to-br from-background via-muted/5 to-secondary/5 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <StandardHeader 
              title={greeting}
              description="Your wellness journey starts today."
              emoji={emoji}
            />
          </div>

          {/* Grid Layout with NewsCards - CTO Approved Row Balancing */}
          <div className="grid grid-cols-12 gap-6 auto-rows-[280px]">
            {/* Row 1: Large card + 2 small cards */}
            <div className="col-span-6">
              <VitanaIndexCard />
            </div>
            <div className="col-span-3">
              <AutoPilotActionCard />
            </div>
            <div className="col-span-3">
              <NewsCard 
                title="Weekly Wellness Meetup Tonight"
                description="Join Dr. Sarah Miller and 50+ community members for meditation and healthy cooking tips"
                imageUrl="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&crop=center"
                pillar="Mental"
                author={{
                  name: "Dr. Sarah Miller",
                  avatar: "/lovable-uploads/sarah-miller-avatar.jpg"
                }}
                location="Downtown Center"
                attendees={52}
                timestamp="7:00 PM"
                onClick={() => navigate("/community/events")}
                className="h-full"
              />
            </div>
            
            {/* Row 2: Small + Small + Large pattern */}
            <div className="col-span-3">
              <SmartCalendarCard />
            </div>
            <div className="col-span-3">
              <LifestylePlanCard type="nutrition" />
            </div>
            <div className="col-span-6">
              <NewsCard 
                title="Emma Wilson Completes 30-Day Challenge"
                description="Inspiring transformation journey with consistent nutrition tracking and community support"
                imageUrl="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center"
                pillar="Nutrition"
                author={{
                  name: "Emma Wilson",
                  avatar: "/lovable-uploads/emma-wilson-avatar.jpg"
                }}
                timestamp="2 hours ago"
                onClick={() => navigate("/community/feed")}
                className="h-full"
              />
            </div>
            
            {/* Row 3: Large + Small + Small */}
            <div className="col-span-6">
              <NewsCard 
                title="Live Yoga Session with Lisa Chen"
                description="Morning flow for energy and mindfulness - perfect for busy professionals"
                imageUrl="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop&crop=center"
                pillar="Mental"
                author={{
                  name: "Lisa Chen",
                  avatar: "/lovable-uploads/lisa-chen-avatar.jpg"
                }}
                location="Virtual"
                attendees={28}
                timestamp="Tomorrow 8 AM"
                onClick={() => navigate("/calendar/events")}
                className="h-full"
              />
            </div>
            <div className="col-span-3">
              <LifestylePlanCard type="hydration" />
            </div>
            <div className="col-span-3">
              <PodcastCard />
            </div>
            
            {/* Row 4: Small + Small + Large */}
            <div className="col-span-3">
              <LifestylePlanCard type="exercise" />
            </div>
            <div className="col-span-3">
              <MusicCard />
            </div>
            <div className="col-span-6">
              <NewsCard 
                title="James Davis Reaches Fitness Milestone"
                description="Completed his first marathon and raised $5000 for mental health awareness"
                imageUrl="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center"
                pillar="Exercise"
                author={{
                  name: "James Davis",
                  avatar: "/lovable-uploads/james-davis-avatar.jpg"
                }}
                location="City Marathon"
                timestamp="Yesterday"
                onClick={() => navigate("/community/feed")}
                className="h-full"
              />
            </div>
            
            {/* Row 5: Mixed system and news cards */}
            <div className="col-span-4">
              <VideoFeedCard />
            </div>
            <div className="col-span-4">
              <NewsCard 
                title="Nutrition Workshop: Meal Prep Mastery"
                description="Learn from certified nutritionist Mike Thompson about sustainable meal planning"
                imageUrl="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop&crop=center"
                pillar="Nutrition"
                author={{
                  name: "Mike Thompson",
                  avatar: "/lovable-uploads/mike-thompson-avatar.jpg"
                }}
                location="Wellness Center"
                attendees={15}
                timestamp="This Saturday"
                onClick={() => navigate("/discover/wellness-services")}
                className="h-full"
              />
            </div>
            <div className="col-span-4">
              <CommunityPulseCard />
            </div>
            
            {/* Row 6: Final row with remaining cards */}
            <div className="col-span-3">
              <LifestylePlanCard type="sleep" />
            </div>
            <div className="col-span-3">
              <ProgressStreaksCard />
            </div>
            <div className="col-span-3">
              <DataWalletCard />
            </div>
            <div className="col-span-3">
              <DiscoverPicksCard />
            </div>
            
            {/* Row 7: Final NewsCard */}
            <div className="col-span-8">
              <NewsCard 
                title="Monthly Health & Wellness Fair"
                description="Meet local practitioners, try new wellness services, and connect with your community"
                imageUrl="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&crop=center"
                pillar="Hydration"
                author={{
                  name: "VITANA Community"
                }}
                location="Central Park"
                attendees={200}
                timestamp="Next Weekend"
                onClick={() => navigate("/community/events")}
                className="h-full"
              />
            </div>
            <div className="col-span-4">
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