import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { discoverNavigation } from "@/config/navigation";
import { Stethoscope, Dumbbell, Brain, Sparkles, Heart, Leaf, Zap, Coffee, Grid3X3, Plane } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";

export default function WellnessServices() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Wellness Services 🌿</h1>
                <p className="text-muted-foreground">Explore wellness solutions organized by health verticals and longevity pillars.</p>
              </div>
            </div>
            
            {/* Autopilot Card with Live Badge Counter */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onClick={() => setAutopilotOpen(true)}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                  {latestActions.map((action, index) => (
                    <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>
                  ))}
                  {pendingCount > 2 && (
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      +{pendingCount - 2} more actions
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Vitana Index Card - Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

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
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}