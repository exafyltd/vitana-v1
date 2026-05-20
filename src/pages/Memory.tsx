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
import { AddMemoryDialog } from "@/components/memory/AddMemoryDialog";
import { MemoryCategoryGrid } from "@/components/memory/MemoryCategoryGrid";
import { WhatVitanaKnows } from "@/components/memory/WhatVitanaKnows";
import { MemoryTimelineTab } from "@/components/memory/MemoryTimelineTab";
import { MemoryEducationTab } from "@/components/memory/MemoryEducationTab";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
// Mock data for Memory Overview - Recent Memories
const recentMemories = [
  {
    title: "Morning Wellness Reflection 🌅",
    description: "Captured the perfect sunrise yoga session and meditation insights",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    author: { name: "You", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Home Studio",
    timestamp: "This morning"
  },
  {
    title: "Hydration Milestone Achievement 💧",
    description: "Successfully completed 30-day water tracking challenge",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "achievement" as const,
    pillar: "Hydration",
    author: { name: "Health Tracker", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Progress Hub",
    timestamp: "Yesterday"
  },
  {
    title: "Nutrition Discovery Voice Note 🎤",
    description: "Recorded insights about Mediterranean diet effects on energy levels",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Nutrition",
    author: { name: "Voice Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Kitchen",
    timestamp: "2 days ago"
  }
];

// Health Timeline Events
const timelineEvents = [
  {
    title: "Sleep Pattern Breakthrough 😴",
    description: "Discovered optimal bedtime routine leading to 95% sleep quality score",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    author: { name: "Sleep Tracker", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Bedroom",
    timestamp: "3 days ago"
  },
  {
    title: "Exercise Milestone Celebration 🏃‍♀️",
    description: "Completed first 10K run after 3 months of training progression",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "achievement" as const,
    pillar: "Exercise",
    author: { name: "Fitness Tracker", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "City Park",
    timestamp: "1 week ago"
  },
  {
    title: "Mindfulness Photo Collection 📸",
    description: "Weekly gratitude photo series showcasing daily wellness moments",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Mental",
    author: { name: "Photo Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Various",
    timestamp: "This week"
  }
];

// Diary Entries
const diaryEntries = [
  {
    title: "Voice Reflection: Energy Levels 🎙️",
    description: "Detailed analysis of how morning routines impact daily energy patterns",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Mental",
    author: { name: "Voice Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Morning Routine",
    timestamp: "Today"
  },
  {
    title: "Wellness Photo Journey 📱",
    description: "Visual diary of healthy meal prep and mindful eating practices",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Nutrition",
    author: { name: "Photo Diary", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Kitchen Studio",
    timestamp: "Yesterday"
  },
  {
    title: "Community Connection Memory 👥",
    description: "Memorable yoga class experience and new friendships formed",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Mental",
    author: { name: "Community", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Wellness Center",
    timestamp: "2 days ago"
  }
];

export default withScreenId(function Memory() {
  const [activeTab, setActiveTab] = useState("categories");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  
  // Mock sync timestamp - will be replaced with real data
  const mockSyncTimestamp = formatDistanceToNow(new Date(Date.now() - 2 * 60 * 60 * 1000), { addSuffix: true });

  return (
    <AppLayout>
      <SEO title={t('screens.memory.memoryHubVitana')} description="Track and review your wellness journey through AI-driven insights and memory tracking." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <StandardHeader 
          title={t('screens.memory.memoryHub')}
          description="Track and review your wellness journey through AI-driven insights."
          emoji="🧠"
          syncTimestamp={`Last synced ${mockSyncTimestamp}`}
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t('screens.memory.searchMemoriesInsightsTimeline')} />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('screens.memory.addMemory')}
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="categories">{t('screens.memory.categories')}</SplitBarTrigger>
            <SplitBarTrigger value="timeline">{t('screens.memory.timeline')}</SplitBarTrigger>
            <SplitBarTrigger value="education">{t('screens.memory.education')}</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="categories">
            <div className="mt-6 space-y-4">
              <WhatVitanaKnows />
              <MemoryCategoryGrid />
            </div>
          </SplitBarContent>

          <SplitBarContent value="timeline">
            <MemoryTimelineTab />
          </SplitBarContent>

          <SplitBarContent value="education">
            <MemoryEducationTab />
          </SplitBarContent>
        </SplitBar>

        <AddMemoryDialog
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.MEMORY_OVERVIEW);