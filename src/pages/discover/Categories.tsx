import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Dumbbell, Brain, Sparkles, Heart, Leaf, Zap, Coffee, Grid3X3 } from "lucide-react";

const discoverSubItems = [
  { id: "overview", name: "Overview", path: "/discover" },
  { id: "browse", name: "Browse All", path: "/discover/browse" },
  { id: "categories", name: "Categories", path: "/discover/categories" },
  { id: "providers", name: "Providers", path: "/discover/providers" },
  { id: "deals", name: "Deals & Offers", path: "/discover/deals" },
  { id: "trending", name: "Trending", path: "/discover/trending" },
  { id: "recommendations", name: "Recommendations", path: "/discover/recommendations" },
  { id: "saved", name: "Saved", path: "/discover/saved" },
];

export default function Categories() {
  const categories = [
    {
      id: 1,
      name: "Longevity Medicine",
      description: "Advanced medical assessments and interventions for healthy aging",
      icon: Stethoscope,
      color: "bg-blue-500",
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
      color: "bg-orange-500",
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
      color: "bg-purple-500",
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
      color: "bg-pink-500",
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
      color: "bg-green-500",
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
      color: "bg-indigo-500",
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
      color: "bg-yellow-500",
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
      color: "bg-rose-500",
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
      <SEO title="Categories | Discover" description="Browse wellness categories organized by health verticals" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Browse by Category"
            description="Explore wellness solutions organized by health verticals and longevity pillars."
            icon={Grid3X3}
          />

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`${category.color} p-3 rounded-lg`}>
                      <category.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {category.count}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Featured Services:</div>
                    {category.featured.map((service, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-xs text-muted-foreground">{service}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button size="sm" className="w-full">
                    Explore {category.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}