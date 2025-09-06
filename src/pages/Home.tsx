import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { CardEnvelopeFactory } from "@/components/layout/CardEnvelopeFactory";
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

  // Generate unified card envelopes for the new layout system
  const cardEnvelopes = [
    // System cards
    CardEnvelopeFactory.createSystemCardEnvelope('vitana-index'),
    CardEnvelopeFactory.createActionCardEnvelope(),
    
    // News cards with pillar badges
    CardEnvelopeFactory.createNewsCardEnvelope({
      id: 'news-1',
      title: "Weekly Wellness Meetup Tonight",
      description: "Join Dr. Sarah Miller and 50+ community members for meditation and healthy cooking tips",
      pillar: "Mental",
      priority: 85
    }),
    
    CardEnvelopeFactory.createLifestylePlanCardEnvelope('nutrition'),
    CardEnvelopeFactory.createLifestylePlanCardEnvelope('hydration'),
    
    CardEnvelopeFactory.createNewsCardEnvelope({
      id: 'news-2', 
      title: "Emma Wilson Completes 30-Day Challenge",
      description: "Inspiring transformation journey with consistent nutrition tracking and community support",
      pillar: "Nutrition",
      priority: 75
    }),
    
    CardEnvelopeFactory.createSystemCardEnvelope('calendar'),
    CardEnvelopeFactory.createLifestylePlanCardEnvelope('exercise'),
    
    CardEnvelopeFactory.createNewsCardEnvelope({
      id: 'news-3',
      title: "Live Yoga Session with Lisa Chen", 
      description: "Morning flow for energy and mindfulness - perfect for busy professionals",
      pillar: "Mental",
      priority: 70
    }),
    
    CardEnvelopeFactory.createMediaCardEnvelope('podcast'),
    CardEnvelopeFactory.createLifestylePlanCardEnvelope('sleep'),
    CardEnvelopeFactory.createLifestylePlanCardEnvelope('mental'),
    
    CardEnvelopeFactory.createNewsCardEnvelope({
      id: 'news-4',
      title: "James Davis Reaches Fitness Milestone",
      description: "Completed his first marathon and raised $5000 for mental health awareness", 
      pillar: "Exercise",
      priority: 65
    }),
    
    CardEnvelopeFactory.createMediaCardEnvelope('music'),
    CardEnvelopeFactory.createMediaCardEnvelope('video'),
    
    CardEnvelopeFactory.createNewsCardEnvelope({
      id: 'news-5',
      title: "Nutrition Workshop: Meal Prep Mastery",
      description: "Learn from certified nutritionist Mike Thompson about sustainable meal planning",
      pillar: "Nutrition", 
      priority: 60
    }),
    
    CardEnvelopeFactory.createSystemCardEnvelope('community-pulse'),
    CardEnvelopeFactory.createSystemCardEnvelope('progress-streaks'),
    CardEnvelopeFactory.createSystemCardEnvelope('data-wallet'),
    CardEnvelopeFactory.createSystemCardEnvelope('discover-picks'),
    CardEnvelopeFactory.createSystemCardEnvelope('motivation'),
    
    CardEnvelopeFactory.createNewsCardEnvelope({
      id: 'news-6',
      title: "Monthly Health & Wellness Fair",
      description: "Meet local practitioners, try new wellness services, and connect with your community",
      pillar: "Hydration",
      priority: 55
    })
  ];

  // Layout configuration with CTO-approved settings
  const layoutConfig = {
    placement_seed: CardEnvelopeFactory.generatePlacementSeed('home', profile?.displayName || 'anonymous'),
    max_cards_per_row: 3,
    pillar_cycle_rows: 3, // Ensure all pillars appear every 3 rows
    type_alternation: true // Prevent adjacent media cards
  };

  return (
    <AppLayout>
      <SEO title="Home | VITANA" description="VITANA Home" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-background via-muted/5 to-secondary/5 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <StandardHeader 
              title={greeting}
              description="Your wellness journey starts with today's opportunities."
              emoji={emoji}
            />
          </div>

          {/* Unified Layout System - CTO Approved Implementation */}
          <UnifiedLayout 
            cards={cardEnvelopes}
            config={layoutConfig}
            className="unified-home-layout"
          />
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