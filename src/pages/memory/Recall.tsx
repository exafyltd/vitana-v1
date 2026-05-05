import { useState } from 'react';
import { Plus, Search } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { NewsCard } from "@/components/crossover/NewsCard";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { RecallMasterActionPopup } from "@/components/memory/RecallMasterActionPopup";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { t } from '@/lib/i18n-toast';

// Mock search results data
const searchResults = [
  {
    title: "Morning Yoga Benefits Analysis 🧘‍♀️",
    description: "AI found patterns in your wellness data showing improved flexibility and reduced stress levels",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "VITANA AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Found in 247 memories"
  },
  {
    title: "Nutrition Impact on Energy 🥗",
    description: "Your Mediterranean diet entries correlate with 23% higher energy levels",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    pillar: "Nutrition", 
    author: { name: "Health Analytics", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Analyzed 89 entries"
  },
  {
    title: "Sleep Quality Timeline 💤",
    description: "Discovered optimal bedtime patterns through your voice diary entries",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "Sleep AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "12 pattern matches"
  }
];

// Memory insights data
const memoryInsights = [
  {
    title: "Wellness Pattern Recognition 🔍",
    description: "AI detected recurring themes in your wellness journey showing consistent progress",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Pattern AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Weekly analysis"
  },
  {
    title: "Exercise Progression Insights 🏃‍♀️", 
    description: "Your fitness memories show remarkable improvement in endurance and strength",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "Fitness AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Monthly insight"
  },
  {
    title: "Hydration Success Story 💧",
    description: "AI found connections between water intake and improved mood in your diary entries",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    pillar: "Hydration",
    author: { name: "Health AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Data correlation"
  }
];

// Quick recall queries data
const quickRecallQueries = [
  {
    title: "Exercise Milestones 🏆",
    description: "\"Show me all my fitness achievements and breakthrough moments\"",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "Quick Search", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Ready to search"
  },
  {
    title: "Nutrition Discoveries 🍎",
    description: "\"Find all my healthy recipe experiments and meal insights\"",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Quick Search", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Instant recall"
  },
  {
    title: "Sleep Optimization Journey 🌙",
    description: "\"Recall all my sleep experiments and quality improvements\"",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "Quick Search", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Pattern ready"
  }
];

function Recall() {
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title={t('screens.memory.aiMemoryRecallVitanaMemory')} description="Use AI-powered search to recall and analyze your wellness memories instantly." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title={t('screens.memory.aiMemoryRecall')}
          description="Use AI-powered search to recall and analyze your wellness memories instantly."
          emoji="🤖"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t('screens.memory.askAiAboutYourWellnessJourney')} />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Memory Actions
          </Button>
        </UtilityActionButton>

        {/* AI Memory Search Section */}
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 mt-6 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              AI Memory Search
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input
              placeholder={t('screens.memory.askAiWhatHelpedImproveMy')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Search Memories
            </Button>
          </CardContent>
        </Card>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="search">{t('screens.memory.searchResults')}</SplitBarTrigger>
            <SplitBarTrigger value="insights">{t('screens.memory.aiInsights')}</SplitBarTrigger>
            <SplitBarTrigger value="quick">{t('screens.memory.quickRecall')}</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="search">
            <div className="mt-6">
              {/* Row 1: Search Results (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={searchResults[0]?.title || ""}
                    description={searchResults[0]?.description}
                    imageUrl={searchResults[0]?.imageUrl || ""}
                    category="wellness"
                    pillar={searchResults[0]?.pillar}
                    author={searchResults[0]?.author}
                    timestamp={searchResults[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={searchResults[1]?.title || ""}
                    description={searchResults[1]?.description}
                    imageUrl={searchResults[1]?.imageUrl || ""}
                    category="wellness"
                    pillar={searchResults[1]?.pillar}
                    author={searchResults[1]?.author}
                    timestamp={searchResults[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={searchResults[2]?.title || ""}
                    description={searchResults[2]?.description}
                    imageUrl={searchResults[2]?.imageUrl || ""}
                    category="wellness"
                    pillar={searchResults[2]?.pillar}
                    author={searchResults[2]?.author}
                    timestamp={searchResults[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="guidance" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="insights">
            <div className="mt-6">
              {/* Row 1: AI Insights (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={memoryInsights[0]?.title || ""}
                    description={memoryInsights[0]?.description}
                    imageUrl={memoryInsights[0]?.imageUrl || ""}
                    category="wellness"
                    pillar={memoryInsights[0]?.pillar}
                    author={memoryInsights[0]?.author}
                    timestamp={memoryInsights[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={memoryInsights[1]?.title || ""}
                    description={memoryInsights[1]?.description}
                    imageUrl={memoryInsights[1]?.imageUrl || ""}
                    category="wellness"
                    pillar={memoryInsights[1]?.pillar}
                    author={memoryInsights[1]?.author}
                    timestamp={memoryInsights[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={memoryInsights[2]?.title || ""}
                    description={memoryInsights[2]?.description}
                    imageUrl={memoryInsights[2]?.imageUrl || ""}
                    category="wellness"
                    pillar={memoryInsights[2]?.pillar}
                    author={memoryInsights[2]?.author}
                    timestamp={memoryInsights[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="encouragement" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="quick">
            <div className="mt-6">
              {/* Row 1: Quick Recall (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={quickRecallQueries[0]?.title || ""}
                    description={quickRecallQueries[0]?.description}
                    imageUrl={quickRecallQueries[0]?.imageUrl || ""}
                    category="wellness"
                    pillar={quickRecallQueries[0]?.pillar}
                    author={quickRecallQueries[0]?.author}
                    timestamp={quickRecallQueries[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={quickRecallQueries[1]?.title || ""}
                    description={quickRecallQueries[1]?.description}
                    imageUrl={quickRecallQueries[1]?.imageUrl || ""}
                    category="wellness"
                    pillar={quickRecallQueries[1]?.pillar}
                    author={quickRecallQueries[1]?.author}
                    timestamp={quickRecallQueries[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={quickRecallQueries[2]?.title || ""}
                    description={quickRecallQueries[2]?.description}
                    imageUrl={quickRecallQueries[2]?.imageUrl || ""}
                    category="wellness"
                    pillar={quickRecallQueries[2]?.pillar}
                    author={quickRecallQueries[2]?.author}
                    timestamp={quickRecallQueries[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="partnership" />
            </div>
          </SplitBarContent>
        </SplitBar>

        <RecallMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Recall, SCREEN_IDS.MEMORY_RECALL);