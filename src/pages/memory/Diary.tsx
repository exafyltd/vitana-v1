import { useState } from "react";
import { Plus } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { DiaryMasterActionPopup } from "@/components/memory/DiaryMasterActionPopup";
import { NewsCard } from "@/components/crossover/NewsCard";
import VoiceDiaryRecorder from "@/components/memory/VoiceDiaryRecorder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Mic } from "lucide-react";

// Mock data for Diary - Voice Entries
const voiceEntries = [
  {
    title: "Morning Wellness Reflection 🎙️",
    description: "\"Feeling amazing after my new sleep routine. The meditation app transformed my nights!\"",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Mental",
    author: { name: "Voice Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Home Studio",
    timestamp: "Today 9:30 AM"
  },
  {
    title: "Nutrition Discovery Session 🥗",
    description: "\"The Mediterranean recipe exceeded my expectations - satisfying and energizing!\"",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Nutrition",
    author: { name: "Voice Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Kitchen",
    timestamp: "Yesterday 6:15 PM"
  },
  {
    title: "Exercise Progress Update 🏃‍♀️",
    description: "\"My endurance is improving daily! Setting ambitious goals for next month.\"",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Exercise",
    author: { name: "Voice Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Gym",
    timestamp: "2 days ago"
  }
];

// Photo Diary Entries
const photoEntries = [
  {
    title: "Colorful Breakfast Bowl 📸",
    description: "Captured my vibrant acai bowl with fresh berries and granola - pure wellness art!",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Nutrition",
    author: { name: "Photo Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Kitchen",
    timestamp: "Today 8:00 AM"
  },
  {
    title: "Sunset Yoga Session 🧘‍♀️",
    description: "Perfect golden hour meditation moment in my garden sanctuary",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Mental",
    author: { name: "Photo Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Garden",
    timestamp: "Yesterday 7:30 PM"
  },
  {
    title: "Post-Workout Achievement 💪",
    description: "Celebrating my first 10K completion with the biggest smile ever!",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "achievement" as const,
    pillar: "Exercise",
    author: { name: "Photo Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "City Park",
    timestamp: "3 days ago"
  }
];

// Text Diary Entries
const textEntries = [
  {
    title: "Gratitude Journal Entry ✍️",
    description: "\"Today I'm grateful for the energy boost from my morning routine and the support from my wellness community.\"",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    author: { name: "Text Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Journal",
    timestamp: "Today 10:00 PM"
  },
  {
    title: "Sleep Quality Insights 💤",
    description: "\"Discovered that blue light blocking glasses significantly improved my sleep score from 72% to 89%.\"",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    author: { name: "Text Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Bedroom",
    timestamp: "Yesterday"
  },
  {
    title: "Community Connection Story 🤝",
    description: "\"Met three amazing people in the Mediterranean diet group today. We're planning a healthy cooking session!\"",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Mental",
    author: { name: "Text Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Community Forum",
    timestamp: "2 days ago"
  }
];

function Diary() {
  const [activeTab, setActiveTab] = useState("voice");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Voice Diary | VITANA Memory" description="Record and review your wellness journey through voice entries, photos, and personal reflections." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Wellness Diary"
          description="Record and review your wellness journey through multimedia entries."
          emoji="📔"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search diary entries and reflections..." />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </UtilityActionButton>

        {/* Voice Recorder Section */}
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 mt-6 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-purple-600" />
              Record Today's Entry
            </CardTitle>
            <CardDescription>
              Share your thoughts, feelings, and wellness observations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceDiaryRecorder />
          </CardContent>
        </Card>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="voice">Voice</SplitBarTrigger>
            <SplitBarTrigger value="photos">Photos</SplitBarTrigger>
            <SplitBarTrigger value="text">Text</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="voice">
            <div className="mt-6">
              {/* Row 1: Voice Entries (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={voiceEntries[0]?.title || ""}
                    description={voiceEntries[0]?.description}
                    imageUrl={voiceEntries[0]?.imageUrl || ""}
                    category={voiceEntries[0]?.category}
                    pillar={voiceEntries[0]?.pillar}
                    author={voiceEntries[0]?.author}
                    location={voiceEntries[0]?.location}
                    timestamp={voiceEntries[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={voiceEntries[1]?.title || ""}
                    description={voiceEntries[1]?.description}
                    imageUrl={voiceEntries[1]?.imageUrl || ""}
                    category={voiceEntries[1]?.category}
                    pillar={voiceEntries[1]?.pillar}
                    author={voiceEntries[1]?.author}
                    location={voiceEntries[1]?.location}
                    timestamp={voiceEntries[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={voiceEntries[2]?.title || ""}
                    description={voiceEntries[2]?.description}
                    imageUrl={voiceEntries[2]?.imageUrl || ""}
                    category={voiceEntries[2]?.category}
                    pillar={voiceEntries[2]?.pillar}
                    author={voiceEntries[2]?.author}
                    location={voiceEntries[2]?.location}
                    timestamp={voiceEntries[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="encouragement" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="photos">
            <div className="mt-6">
              {/* Row 1: Photo Entries (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={photoEntries[0]?.title || ""}
                    description={photoEntries[0]?.description}
                    imageUrl={photoEntries[0]?.imageUrl || ""}
                    category={photoEntries[0]?.category}
                    pillar={photoEntries[0]?.pillar}
                    author={photoEntries[0]?.author}
                    location={photoEntries[0]?.location}
                    timestamp={photoEntries[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={photoEntries[1]?.title || ""}
                    description={photoEntries[1]?.description}
                    imageUrl={photoEntries[1]?.imageUrl || ""}
                    category={photoEntries[1]?.category}
                    pillar={photoEntries[1]?.pillar}
                    author={photoEntries[1]?.author}
                    location={photoEntries[1]?.location}
                    timestamp={photoEntries[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={photoEntries[2]?.title || ""}
                    description={photoEntries[2]?.description}
                    imageUrl={photoEntries[2]?.imageUrl || ""}
                    category={photoEntries[2]?.category}
                    pillar={photoEntries[2]?.pillar}
                    author={photoEntries[2]?.author}
                    location={photoEntries[2]?.location}
                    timestamp={photoEntries[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="partnership" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="text">
            <div className="mt-6">
              {/* Row 1: Text Entries (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={textEntries[0]?.title || ""}
                    description={textEntries[0]?.description}
                    imageUrl={textEntries[0]?.imageUrl || ""}
                    category={textEntries[0]?.category}
                    pillar={textEntries[0]?.pillar}
                    author={textEntries[0]?.author}
                    location={textEntries[0]?.location}
                    timestamp={textEntries[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={textEntries[1]?.title || ""}
                    description={textEntries[1]?.description}
                    imageUrl={textEntries[1]?.imageUrl || ""}
                    category={textEntries[1]?.category}
                    pillar={textEntries[1]?.pillar}
                    author={textEntries[1]?.author}
                    location={textEntries[1]?.location}
                    timestamp={textEntries[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={textEntries[2]?.title || ""}
                    description={textEntries[2]?.description}
                    imageUrl={textEntries[2]?.imageUrl || ""}
                    category={textEntries[2]?.category}
                    pillar={textEntries[2]?.pillar}
                    author={textEntries[2]?.author}
                    location={textEntries[2]?.location}
                    timestamp={textEntries[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="guidance" />
            </div>
          </SplitBarContent>
        </SplitBar>

        <DiaryMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Diary, SCREEN_IDS.MEMORY_DIARY);