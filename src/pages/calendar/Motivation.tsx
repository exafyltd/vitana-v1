import { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, 
  Star, 
  Play, 
  BookOpen,
  Calendar,
  Filter,
  Pin,
  Share2
} from "lucide-react";

const calendarSubItems = [
  { id: "overview", name: "Overview", path: "/calendar" },
  { id: "month", name: "Month View", path: "/calendar/month" },
  { id: "week", name: "Week View", path: "/calendar/week" },
  { id: "day", name: "Day View", path: "/calendar/day" },
  { id: "appointments", name: "Appointments", path: "/calendar/appointments" },
  { id: "reminders", name: "Reminders", path: "/calendar/reminders" },
  { id: "motivation", name: "Motivation", path: "/calendar/motivation" },
  { id: "progress", name: "Goal Progress", path: "/calendar/progress" },
  { id: "recommendations", name: "Recommendations", path: "/calendar/recommendations" },
];

const motivationContent = [
  {
    id: 1,
    type: "quote",
    title: "Daily Wellness Wisdom",
    content: "Your body is your temple. Keep it pure and clean for the soul to reside in.",
    author: "B.K.S. Iyengar",
    category: "mindfulness",
    pinned: false,
    likes: 234
  },
  {
    id: 2,
    type: "video",
    title: "5-Minute Morning Energy Boost",
    content: "Start your day with this energizing routine",
    duration: "5:23",
    category: "fitness",
    pinned: true,
    likes: 456
  },
  {
    id: 3,
    type: "story",
    title: "Sarah's 30-Day Transformation",
    content: "How consistent daily walks changed everything...",
    author: "Sarah Chen",
    category: "success",
    pinned: false,
    likes: 189,
    avatar: ""
  },
  {
    id: 4,
    type: "quote",
    title: "Nutrition Insight",
    content: "Let food be thy medicine and medicine be thy food.",
    author: "Hippocrates",
    category: "nutrition",
    pinned: false,
    likes: 312
  },
  {
    id: 5,
    type: "video",
    title: "Stress Relief Breathing Technique",
    content: "3-minute breathing exercise for instant calm",
    duration: "3:14",
    category: "mindfulness",
    pinned: false,
    likes: 278
  }
];

const categories = ["all", "mindfulness", "fitness", "nutrition", "success"];
const moods = ["energetic", "calm", "motivated", "focused"];

export default function Motivation() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [pinnedItems, setPinnedItems] = useState<number[]>([2]);

  const filteredContent = motivationContent.filter(item => 
    selectedCategory === "all" || item.category === selectedCategory
  );

  const togglePin = (itemId: number) => {
    setPinnedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderContentCard = (item: typeof motivationContent[0]) => {
    const isPinned = pinnedItems.includes(item.id);

    return (
      <Card key={item.id} className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="capitalize">
                  {item.category}
                </Badge>
                {item.type === "video" && (
                  <Badge variant="outline" className="gap-1">
                    <Play className="w-3 h-3" />
                    {item.duration}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => togglePin(item.id)}
                className={isPinned ? "text-primary" : "text-muted-foreground"}
              >
                <Pin className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {item.type === "quote" && (
            <div>
              <blockquote className="text-lg italic text-muted-foreground mb-3 leading-relaxed">
                "{item.content}"
              </blockquote>
              <p className="text-sm font-medium">— {item.author}</p>
            </div>
          )}

          {item.type === "video" && (
            <div>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 mb-3 flex items-center justify-center">
                <Button size="lg" className="gap-2">
                  <Play className="w-5 h-5" />
                  Watch Now
                </Button>
              </div>
              <p className="text-muted-foreground">{item.content}</p>
            </div>
          )}

          {item.type === "story" && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={item.avatar} />
                  <AvatarFallback>{item.author?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{item.author}</span>
              </div>
              <p className="text-muted-foreground mb-3">{item.content}</p>
              <Button variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Read Full Story
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1">
                <Heart className="w-4 h-4" />
                {item.likes}
              </Button>
              <Button variant="ghost" size="sm">
                <Star className="w-4 h-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              Pin to Date
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <SEO 
        title="Motivation & Inspiration | Calendar" 
        description="Curated content to boost your wellness mindset and maintain goal alignment" 
        canonical={window.location.href} 
      />
      <SubNavigation items={calendarSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Motivation & Inspiration ✨
                </h1>
                <p className="text-muted-foreground">
                  Keep your energy aligned to your wellness goals with curated content
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Mood Filters */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Filter by mood:</p>
              <div className="flex flex-wrap gap-2">
                {moods.map((mood) => (
                  <Button
                    key={mood}
                    variant={selectedMood === mood ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
                    className="capitalize"
                  >
                    {mood}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Pinned Content */}
          {pinnedItems.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Pin className="w-5 h-5" />
                Pinned for Today
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent
                  .filter(item => pinnedItems.includes(item.id))
                  .map(renderContentCard)}
              </div>
            </div>
          )}

          {/* Content Grid */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {selectedCategory === "all" ? "All Content" : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Content`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent
                .filter(item => !pinnedItems.includes(item.id))
                .map(renderContentCard)}
            </div>
          </div>

          {/* AI Suggestions */}
          <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                🤖 AI Recommendations
              </h3>
              <p className="text-muted-foreground mb-4">
                Based on your current goals and recent mood logs, here are some personalized suggestions:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Morning Meditation (7 days streak needed)</Badge>
                <Badge variant="outline">Nutrition Success Stories</Badge>
                <Badge variant="outline">Energy Boosting Content</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}