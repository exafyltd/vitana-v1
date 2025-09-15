import { useState } from "react";
import { Plus } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { TimelineMasterActionPopup } from "@/components/memory/TimelineMasterActionPopup";
import { NewsCard } from "@/components/crossover/NewsCard";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

// Mock data for Timeline - Today's Events
const todaysEvents = [
  {
    title: "Morning Biomarker Check ⚕️",
    description: "Blood pressure and heart rate monitoring session completed successfully",
    imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Health",
    author: { name: "Health Tracker", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Home",
    timestamp: "8:30 AM"
  },
  {
    title: "Nutrition Photo Log 📱",
    description: "Captured colorful Mediterranean lunch with fresh vegetables and olive oil",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Nutrition",
    author: { name: "Food Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Kitchen",
    timestamp: "12:15 PM"
  },
  {
    title: "Wellness Community Chat 💬",
    description: "Shared progress and received encouragement from sleep optimization group",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Mental",
    author: { name: "Sleep Community", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Online",
    timestamp: "7:45 PM"
  }
];

// This Week's Timeline Events
const weeklyEvents = [
  {
    title: "Exercise Milestone Achievement 🏃‍♀️",
    description: "Completed first 5K run in under 30 minutes after 6 weeks of training",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "achievement" as const,
    pillar: "Exercise",
    author: { name: "Fitness Tracker", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "City Park",
    timestamp: "Monday"
  },
  {
    title: "Sleep Quality Breakthrough 😴",
    description: "Achieved 95% sleep score using new bedtime routine and mindfulness techniques",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    author: { name: "Sleep Tracker", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Bedroom",
    timestamp: "Tuesday"
  },
  {
    title: "Hydration Success Story 💧",
    description: "Reached optimal daily water intake goal for 7 consecutive days",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "achievement" as const,
    pillar: "Hydration",
    author: { name: "Health AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Daily Routine",
    timestamp: "Wednesday"
  }
];

// This Month's Major Milestones
const monthlyMilestones = [
  {
    title: "Wellness Transformation Journey 🌟",
    description: "30-day comprehensive health improvement program completed with amazing results",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "achievement" as const,
    pillar: "Mental",
    author: { name: "Wellness Coach", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Wellness Center",
    timestamp: "Month Goal"
  },
  {
    title: "Community Leadership Recognition 👥",
    description: "Became top contributor in Mediterranean nutrition community with 50+ helpful posts",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Nutrition",
    author: { name: "Community", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Online Forums",
    timestamp: "This Month"
  },
  {
    title: "Mindfulness Practice Mastery 🧘‍♀️",
    description: "Established consistent daily meditation habit with 28 consecutive days completed",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    author: { name: "Mindfulness App", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Meditation Space",
    timestamp: "Monthly Streak"
  }
];

function Timeline() {
  const [activeTab, setActiveTab] = useState("today");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Health Timeline | VITANA Memory" description="View your comprehensive health timeline and life events in chronological order." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Health Timeline"
          description="Your comprehensive health journey and important life events."
          emoji="⏰"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search timeline events and milestones..." />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Moment
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="today">Today</SplitBarTrigger>
            <SplitBarTrigger value="week">This Week</SplitBarTrigger>
            <SplitBarTrigger value="month">This Month</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="today">
            <div className="mt-6">
              {/* Row 1: Today's Events (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={todaysEvents[0]?.title || ""}
                    description={todaysEvents[0]?.description}
                    imageUrl={todaysEvents[0]?.imageUrl || ""}
                    category={todaysEvents[0]?.category}
                    pillar={todaysEvents[0]?.pillar}
                    author={todaysEvents[0]?.author}
                    location={todaysEvents[0]?.location}
                    timestamp={todaysEvents[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todaysEvents[1]?.title || ""}
                    description={todaysEvents[1]?.description}
                    imageUrl={todaysEvents[1]?.imageUrl || ""}
                    category={todaysEvents[1]?.category}
                    pillar={todaysEvents[1]?.pillar}
                    author={todaysEvents[1]?.author}
                    location={todaysEvents[1]?.location}
                    timestamp={todaysEvents[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todaysEvents[2]?.title || ""}
                    description={todaysEvents[2]?.description}
                    imageUrl={todaysEvents[2]?.imageUrl || ""}
                    category={todaysEvents[2]?.category}
                    pillar={todaysEvents[2]?.pillar}
                    author={todaysEvents[2]?.author}
                    location={todaysEvents[2]?.location}
                    timestamp={todaysEvents[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="encouragement" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="week">
            <div className="mt-6">
              {/* Row 1: Weekly Events (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={weeklyEvents[0]?.title || ""}
                    description={weeklyEvents[0]?.description}
                    imageUrl={weeklyEvents[0]?.imageUrl || ""}
                    category={weeklyEvents[0]?.category}
                    pillar={weeklyEvents[0]?.pillar}
                    author={weeklyEvents[0]?.author}
                    location={weeklyEvents[0]?.location}
                    timestamp={weeklyEvents[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={weeklyEvents[1]?.title || ""}
                    description={weeklyEvents[1]?.description}
                    imageUrl={weeklyEvents[1]?.imageUrl || ""}
                    category={weeklyEvents[1]?.category}
                    pillar={weeklyEvents[1]?.pillar}
                    author={weeklyEvents[1]?.author}
                    location={weeklyEvents[1]?.location}
                    timestamp={weeklyEvents[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={weeklyEvents[2]?.title || ""}
                    description={weeklyEvents[2]?.description}
                    imageUrl={weeklyEvents[2]?.imageUrl || ""}
                    category={weeklyEvents[2]?.category}
                    pillar={weeklyEvents[2]?.pillar}
                    author={weeklyEvents[2]?.author}
                    location={weeklyEvents[2]?.location}
                    timestamp={weeklyEvents[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="partnership" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="month">
            <div className="mt-6">
              {/* Row 1: Monthly Milestones (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={monthlyMilestones[0]?.title || ""}
                    description={monthlyMilestones[0]?.description}
                    imageUrl={monthlyMilestones[0]?.imageUrl || ""}
                    category={monthlyMilestones[0]?.category}
                    pillar={monthlyMilestones[0]?.pillar}
                    author={monthlyMilestones[0]?.author}
                    location={monthlyMilestones[0]?.location}
                    timestamp={monthlyMilestones[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={monthlyMilestones[1]?.title || ""}
                    description={monthlyMilestones[1]?.description}
                    imageUrl={monthlyMilestones[1]?.imageUrl || ""}
                    category={monthlyMilestones[1]?.category}
                    pillar={monthlyMilestones[1]?.pillar}
                    author={monthlyMilestones[1]?.author}
                    location={monthlyMilestones[1]?.location}
                    timestamp={monthlyMilestones[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={monthlyMilestones[2]?.title || ""}
                    description={monthlyMilestones[2]?.description}
                    imageUrl={monthlyMilestones[2]?.imageUrl || ""}
                    category={monthlyMilestones[2]?.category}
                    pillar={monthlyMilestones[2]?.pillar}
                    author={monthlyMilestones[2]?.author}
                    location={monthlyMilestones[2]?.location}
                    timestamp={monthlyMilestones[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="achievement" />
            </div>
          </SplitBarContent>
        </SplitBar>

        <TimelineMasterActionPopup
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Timeline, SCREEN_IDS.MEMORY_TIMELINE);