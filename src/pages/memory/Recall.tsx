import { useState } from "react";
import { Plus, Search, Brain } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { NewsCard } from "@/components/crossover/NewsCard";
import { MemoryMasterActionPopup } from "@/components/memory/MemoryMasterActionPopup";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

// AI Search and Recall results organized by type
const searchResults = [
  {
    title: "Morning Routine Analysis 🤖",
    description: "AI discovered your morning workouts correlate with 78% better sleep quality",
    imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
    pillar: "AI Insights",
    author: { name: "Memory AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Pattern Discovery"
  },
  {
    title: "Nutrition Pattern Found 📊",
    description: "Found 15 entries showing improved energy after plant-based meals",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Search AI", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    timestamp: "Search Results"
  },
  {
    title: "Sleep Correlation Insight 🌙",
    description: "Hydration levels 2 hours before bed impact sleep quality by 32%",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "Pattern Engine", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    timestamp: "AI Analysis"
  }
];

const memoryInsights = [
  {
    title: "Weekly Progress Patterns 📈",
    description: "Your wellness journey shows consistent improvement in 4 key areas",
    imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop",
    pillar: "Progress",
    author: { name: "Analytics Engine", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Trend Analysis"
  },
  {
    title: "Mood & Exercise Connection 💪",
    description: "Detected strong positive correlation between strength training and mood elevation",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "Behavioral AI", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    timestamp: "Insight Generated"
  },
  {
    title: "Stress Management Success 🧘‍♀️",
    description: "Mindfulness practices reduced stress markers by 45% over 3 weeks",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Wellness AI", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    timestamp: "Progress Report"
  }
];

const quickRecallQueries = [
  {
    title: "Recent Workout Sessions 🏃‍♀️",
    description: "Find all exercise entries from the past 2 weeks with performance metrics",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "Quick Search", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    timestamp: "14 Results Found"
  },
  {
    title: "Nutrition Victories 🥗",
    description: "Recall all healthy meal choices and nutritional wins from this month",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Meal Tracker", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    timestamp: "23 Results Found"
  },
  {
    title: "Sleep Quality Trends 😴",
    description: "Review sleep patterns and quality metrics over the last month",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "Sleep Analysis", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    timestamp: "30 Nights Analyzed"
  }
];

function Recall() {
  const [activeTab, setActiveTab] = useState("search");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AppLayout>
      <SEO title="Recall & Search - Vitana Memory" description="Search and recall your health memories with AI assistance." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Recall & Search"
          description="AI-powered search through your health memories and experiences"
          emoji="🔍"
        />

        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder="Search memories and experiences..."
            onSearch={(query) => console.log('Search:', query)}
          />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Memory Actions
          </Button>
        </UtilityActionButton>

        {/* Smart Search Section */}
        <Card className="mt-6 mb-8">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <Brain className="h-12 w-12 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI Memory Search</h3>
              <p className="text-muted-foreground">
                Search through your health timeline using natural language
              </p>
            </div>
            <div className="flex gap-4 max-w-2xl mx-auto">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ask about your health patterns, habits, or progress..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button>
                <Brain className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="search">Search Results</SplitBarTrigger>
            <SplitBarTrigger value="insights">AI Insights</SplitBarTrigger>
            <SplitBarTrigger value="quick">Quick Recall</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="search">
            <div className="mt-6">
              {/* Row 1: Search Results (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={searchResults[0].title}
                    description={searchResults[0].description}
                    imageUrl={searchResults[0].imageUrl}
                    category="wellness"
                    pillar={searchResults[0].pillar}
                    author={searchResults[0].author}
                    timestamp={searchResults[0].timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={searchResults[1].title}
                    description={searchResults[1].description}
                    imageUrl={searchResults[1].imageUrl}
                    category="wellness"
                    pillar={searchResults[1].pillar}
                    author={searchResults[1].author}
                    timestamp={searchResults[1].timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={searchResults[2].title}
                    description={searchResults[2].description}
                    imageUrl={searchResults[2].imageUrl}
                    category="wellness"
                    pillar={searchResults[2].pillar}
                    author={searchResults[2].author}
                    timestamp={searchResults[2].timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="achievement" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="insights">
            <div className="mt-6">
              {/* Row 1: AI Insights (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={memoryInsights[0].title}
                    description={memoryInsights[0].description}
                    imageUrl={memoryInsights[0].imageUrl}
                    category="achievement"
                    pillar={memoryInsights[0].pillar}
                    author={memoryInsights[0].author}
                    timestamp={memoryInsights[0].timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={memoryInsights[1].title}
                    description={memoryInsights[1].description}
                    imageUrl={memoryInsights[1].imageUrl}
                    category="wellness"
                    pillar={memoryInsights[1].pillar}
                    author={memoryInsights[1].author}
                    timestamp={memoryInsights[1].timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={memoryInsights[2].title}
                    description={memoryInsights[2].description}
                    imageUrl={memoryInsights[2].imageUrl}
                    category="wellness"
                    pillar={memoryInsights[2].pillar}
                    author={memoryInsights[2].author}
                    timestamp={memoryInsights[2].timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="partnership" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="quick">
            <div className="mt-6">
              {/* Row 1: Quick Recall (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={quickRecallQueries[0].title}
                    description={quickRecallQueries[0].description}
                    imageUrl={quickRecallQueries[0].imageUrl}
                    category="wellness"
                    pillar={quickRecallQueries[0].pillar}
                    author={quickRecallQueries[0].author}
                    timestamp={quickRecallQueries[0].timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={quickRecallQueries[1].title}
                    description={quickRecallQueries[1].description}
                    imageUrl={quickRecallQueries[1].imageUrl}
                    category="wellness"
                    pillar={quickRecallQueries[1].pillar}
                    author={quickRecallQueries[1].author}
                    timestamp={quickRecallQueries[1].timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={quickRecallQueries[2].title}
                    description={quickRecallQueries[2].description}
                    imageUrl={quickRecallQueries[2].imageUrl}
                    category="wellness"
                    pillar={quickRecallQueries[2].pillar}
                    author={quickRecallQueries[2].author}
                    timestamp={quickRecallQueries[2].timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="achievement" />
            </div>
          </SplitBarContent>
        </SplitBar>

        <MemoryMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Recall, SCREEN_IDS.MEMORY_RECALL);