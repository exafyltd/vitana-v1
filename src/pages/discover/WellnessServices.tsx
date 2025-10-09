import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { discoverNavigation } from "@/config/navigation";
import { Stethoscope, Dumbbell, Brain, Sparkles, Heart, Leaf, Zap, Coffee, Grid3X3, Plane, Plus, RefreshCw } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { DiscoverBookActionPopup } from "@/components/discover/DiscoverBookActionPopup";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";

export default function WellnessServices() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("categories");

  const latestActions = getLatestActions(2);

  const categories = [
    {
      id: 1,
      name: "Longevity Medicine",
      description: "Advanced medical assessments and interventions for healthy aging",
      icon: Stethoscope,
      color: "bg-domain-health-accent",
      count: 234,
      featured: [
        "Health Assessments",
        "IV Therapy",
        "Hormone Optimization",
        "Biomarker Analysis"
      ]
    },
    {
      id: 2,
      name: "Fitness & Movement",
      description: "Exercise programs designed for longevity and vitality",
      icon: Dumbbell,
      color: "bg-pill-exercise-accent",
      count: 156,
      featured: [
        "Functional Fitness",
        "Mobility Training",
        "Strength Building",
        "Flexibility Programs"
      ]
    },
    {
      id: 3,
      name: "Mental Wellness",
      description: "Mindfulness, therapy, and cognitive health services",
      icon: Brain,
      color: "bg-pill-mental-accent",
      count: 189,
      featured: [
        "Meditation",
        "Stress Management",
        "Cognitive Training",
        "Therapy Sessions"
      ]
    },
    {
      id: 4,
      name: "Recovery & Therapy",
      description: "Healing modalities and recovery treatments",
      icon: Sparkles,
      color: "bg-sys-vitana-accent",
      count: 123,
      featured: [
        "Massage Therapy",
        "Cold Plunge",
        "Infrared Sauna",
        "Red Light Therapy"
      ]
    },
    {
      id: 5,
      name: "Nutrition & Supplements",
      description: "Personalized nutrition plans and premium supplements",
      icon: Leaf,
      color: "bg-pill-nutrition-accent",
      count: 267,
      featured: [
        "Meal Planning",
        "Nutritional Counseling",
        "Supplement Plans",
        "Dietary Analysis"
      ]
    },
    {
      id: 6,
      name: "Sleep Optimization",
      description: "Services and products to improve sleep quality",
      icon: Coffee,
      color: "bg-pill-sleep-accent",
      count: 89,
      featured: [
        "Sleep Studies",
        "Sleep Coaching",
        "Circadian Rhythm",
        "Sleep Environment"
      ]
    },
    {
      id: 7,
      name: "Biohacking",
      description: "Advanced technologies and optimization protocols",
      icon: Zap,
      color: "bg-sys-ai-accent",
      count: 145,
      featured: [
        "Wearable Tech",
        "Performance Testing",
        "Optimization Plans",
        "Tracking Systems"
      ]
    },
    {
      id: 8,
      name: "Wellness Hospitality",
      description: "Retreats, spas, and immersive wellness experiences",
      icon: Heart,
      color: "bg-domain-community-accent",
      count: 67,
      featured: [
        "Wellness Retreats",
        "Spa Experiences",
        "Destination Wellness",
        "Immersive Programs"
      ]
    }
  ];

  return (
    <AppLayout>
      <SEO title="Wellness Services | Discover" description="Browse wellness categories organized by health verticals" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Wellness Services"
            description="Explore wellness solutions organized by health verticals and longevity pillars"
            emoji="🧘"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search wellness services…"
            />
            <UniversalCalendarButton />
            <Button 
              size="sm"
              onClick={() => setMasterActionOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Action
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => window.location.reload()}
              title="Refresh page"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="categories">📂 All Categories</SplitBarTrigger>
              <SplitBarTrigger value="recommended">💡 Recommended</SplitBarTrigger>
              <SplitBarTrigger value="bookmarked">🔖 Bookmarked</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="categories" className="space-y-6">
              {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {categories.map((category) => (
              <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-4 md:p-5 lg:p-6 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className={`${category.color} p-2 md:p-3 rounded-lg`}>
                      <category.icon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm md:text-base lg:text-lg text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs md:text-sm">
                          {category.count}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 md:space-y-2 mb-4 flex-1">
                    <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Featured Services:</div>
                    {category.featured.map((service, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full"></div>
                        <span className="text-xs md:text-sm text-muted-foreground">{service}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button size="sm" className="w-full text-xs md:text-sm h-7 md:h-8 lg:h-9 mt-auto">
                    Explore {category.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
            </SplitBarContent>

            <SplitBarContent value="recommended" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                    <h2 className="text-2xl font-semibold">AI-Recommended Services</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">Personalized wellness service recommendations based on your health pillars</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.slice(0, 6).map((category, index) => (
                      <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`${category.color} p-2 rounded-lg`}>
                              <category.icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-sm">{category.name}</h3>
                                <div className="bg-white rounded-full px-2 py-1">
                                  <span className="text-xs font-bold text-purple-600">{92 - index * 2}%</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{category.description}</p>
                            </div>
                          </div>
                          <div className="bg-purple-50 p-2 rounded-lg mb-3">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-purple-500" />
                              <span className="text-xs text-purple-700">Based on your health goals</span>
                            </div>
                          </div>
                          <Button size="sm" className="w-full text-xs">
                            Explore Services
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="bookmarked" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-12 text-center">
                  <div className="text-6xl mb-4">🔖</div>
                  <h3 className="text-xl font-semibold mb-2">No bookmarked services yet</h3>
                  <p className="text-muted-foreground">
                    Bookmark your favorite wellness services and upcoming bookings will appear here
                  </p>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
      <DiscoverBookActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
    </AppLayout>
  );
}