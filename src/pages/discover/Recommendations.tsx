import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Brain, Target, Calendar, Activity, Heart, MapPin, Clock, Zap, Sparkles, TrendingUp } from "lucide-react";

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

export default function Recommendations() {
  const personalizedMatches = [
    {
      id: 1,
      title: "Sleep Optimization Program",
      description: "AI-detected poor sleep patterns. 4-week program to improve sleep quality",
      price: "$199",
      match: 95,
      reason: "Based on your low sleep scores",
      provider: "Dr. Emily Chen, Sleep Specialist",
      image: "/lovable-uploads/dr-roberts-avatar.jpg",
      badge: "Perfect Match",
      availableTime: "Next week"
    },
    {
      id: 2,
      title: "Stress Management Coaching",
      description: "1-on-1 sessions to reduce cortisol levels detected in your tracking",
      price: "$89",
      period: "/session",
      match: 92,
      reason: "High stress indicators detected",
      provider: "Marcus Rodriguez, Wellness Coach",
      image: "/lovable-uploads/mike-thompson-avatar.jpg",
      badge: "High Priority",
      availableTime: "Today 3PM"
    },
    {
      id: 3,
      title: "Nutrition Reset Plan",
      description: "Custom meal planning based on your dietary preferences and goals",
      price: "$149",
      match: 88,
      reason: "Your nutrition pillar needs boost",
      provider: "Luna Wellness Collective",
      image: "/lovable-uploads/lisa-chen-avatar.jpg",
      badge: "Great Match",
      availableTime: "Tomorrow"
    }
  ];

  const healthGoalBoosters = [
    {
      id: 1,
      title: "Flexibility Training Kit",
      description: "Equipment & guide to improve your lowest mobility scores",
      price: "$79",
      goalType: "Mobility",
      improvement: "+23% flexibility",
      image: "/lovable-uploads/james-davis-avatar.jpg"
    },
    {
      id: 2,
      title: "Cardio Endurance Program",
      description: "Personalized running plan based on your current fitness level",
      price: "$49",
      goalType: "Cardio",
      improvement: "+15% endurance",
      image: "/lovable-uploads/se-hun-oh-avatar.jpg"
    },
    {
      id: 3,
      title: "Mindfulness Meditation Course",
      description: "8-week course to boost mental wellness scores",
      price: "$129",
      goalType: "Mental Health",
      improvement: "+30% calm",
      image: "/lovable-uploads/emma-wilson-avatar.jpg"
    }
  ];

  const moodBasedOffers = [
    {
      id: 1,
      title: "Energizing Yoga Flow",
      description: "Combat today's low energy with dynamic movement",
      mood: "Low Energy",
      price: "$35",
      duration: "60 min",
      provider: "Sunrise Yoga Studio",
      nextSlot: "6PM today",
      image: "/lovable-uploads/murphy-avatar.jpg"
    },
    {
      id: 2,
      title: "Calming Massage Therapy",
      description: "Reduce anxiety with therapeutic massage",
      mood: "Stressed",
      price: "$95",
      duration: "90 min",
      provider: "Zen Wellness Spa",
      nextSlot: "4PM today",
      image: "/lovable-uploads/tae-min-avatar.jpg"
    }
  ];

  const bundleSuggestions = [
    {
      id: 1,
      title: "Complete Wellness Starter",
      description: "Fitness tracker + nutrition consultation + yoga classes",
      originalPrice: "$379",
      bundlePrice: "$299",
      savings: "$80",
      items: ["Vitana Tracker Pro", "Nutrition Consultation", "30-Day Yoga Pass"],
      image: "/lovable-uploads/design-team-avatar.jpg"
    },
    {
      id: 2,
      title: "Mental Wellness Package",
      description: "Meditation app + therapy sessions + stress relief kit",
      originalPrice: "$249",
      bundlePrice: "$199",
      savings: "$50",
      items: ["Premium Meditation App", "3 Therapy Sessions", "Stress Relief Kit"],
      image: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Recommendations | Discover" description="AI-powered personalized longevity recommendations" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="AI Recommendations"
            description="Personalized longevity suggestions based on your data and goals"
            icon={Brain}
          />

          {/* Perfect Matches */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-500" />
                Perfect for You
              </h2>
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                <Brain className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {personalizedMatches.map((match) => (
                <Card key={match.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200 h-fit">
                  <div className="relative">
                    <img 
                      src={match.image} 
                      alt={match.title}
                      className="w-full h-32 md:h-36 lg:h-40 xl:h-44 object-cover rounded-t-lg"
                    />
                    <Badge className={`absolute top-2 left-2 text-xs px-2 py-1 ${
                      match.match >= 95 ? 'bg-green-500' : 
                      match.match >= 90 ? 'bg-blue-500' : 'bg-purple-500'
                    } text-white`}>
                      {match.badge}
                    </Badge>
                    <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1">
                      <span className="text-xs font-bold text-purple-600">{match.match}%</span>
                    </div>
                  </div>
                  <CardContent className="p-3 md:p-4 lg:p-5 h-fit">
                    <div className="space-y-2 md:space-y-3">
                      <h3 className="font-semibold text-xs md:text-sm lg:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {match.title}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{match.description}</p>
                      <div className="bg-purple-50 p-2 rounded-lg">
                        <div className="flex items-center gap-1">
                          <Brain className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          <span className="text-xs text-purple-700 font-medium truncate">{match.reason}</span>
                        </div>
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground truncate">{match.provider}</div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-green-600 truncate">{match.availableTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-foreground">{match.price}</span>
                          {match.period && <span className="text-xs text-muted-foreground">{match.period}</span>}
                        </div>
                        <Button size="sm" className="text-xs md:text-sm h-7 md:h-8 lg:h-9">Book</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Health Goal Boosters */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Target className="h-6 w-6 text-blue-500" />
                Boost Your Weakest Areas
              </h2>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Based on Vitana Index
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {healthGoalBoosters.map((booster) => (
                <Card key={booster.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit">
                  <div className="relative">
                    <img 
                      src={booster.image} 
                      alt={booster.title}
                      className="w-full h-32 md:h-36 lg:h-40 xl:h-44 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1">
                      {booster.goalType}
                    </Badge>
                  </div>
                  <CardContent className="p-3 md:p-4 lg:p-5 h-fit">
                    <div className="space-y-2 md:space-y-3">
                      <h3 className="font-semibold text-xs md:text-sm lg:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {booster.title}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{booster.description}</p>
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <span className="text-xs text-blue-700 font-medium truncate">{booster.improvement}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{booster.price}</span>
                        <Button size="sm" className="text-xs md:text-sm h-7 md:h-8 lg:h-9">Start</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Mood-Based Offers */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Heart className="h-6 w-6 text-pink-500" />
                Based on Your Current Mood
              </h2>
              <Badge variant="outline" className="text-pink-600 border-pink-200">
                Right Now
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {moodBasedOffers.map((offer) => (
                <Card key={offer.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="relative">
                    <img 
                      src={offer.image} 
                      alt={offer.title}
                      className="w-full h-32 md:h-40 lg:h-44 xl:h-48 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 left-3 bg-pink-500 text-white">
                      For {offer.mood}
                    </Badge>
                  </div>
                  <CardContent className="p-3 md:p-4 lg:p-5">
                    <h3 className="font-semibold text-sm md:text-base lg:text-lg text-foreground mb-2 md:mb-3 group-hover:text-primary transition-colors">{offer.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">{offer.description}</p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{offer.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{offer.provider}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Available {offer.nextSlot}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">{offer.price}</span>
                      <Button size="sm" className="h-7 md:h-8 lg:h-9 text-xs md:text-sm">Book Session</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Bundle Suggestions */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-6 w-6 text-green-500" />
                Recommended Bundles
              </h2>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Save More
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bundleSuggestions.map((bundle) => (
                <Card key={bundle.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-green-200">
                  <div className="relative">
                    <img 
                      src={bundle.image} 
                      alt={bundle.title}
                      className="w-full h-32 md:h-40 lg:h-44 xl:h-48 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 left-3 bg-green-500 text-white">
                      Save {bundle.savings}
                    </Badge>
                  </div>
                  <CardContent className="p-3 md:p-4 lg:p-5">
                    <h3 className="font-semibold text-sm md:text-base lg:text-lg text-foreground mb-2 md:mb-3 group-hover:text-primary transition-colors">{bundle.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">{bundle.description}</p>
                    <div className="space-y-2 mb-4">
                      {bundle.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs md:text-sm text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">{bundle.bundlePrice}</span>
                        <span className="text-lg text-muted-foreground line-through">{bundle.originalPrice}</span>
                      </div>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 h-7 md:h-8 lg:h-9 text-xs md:text-sm">Get Bundle</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}