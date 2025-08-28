import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { discoverNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Flame, Percent, Package, Star, MapPin, Clock, TrendingDown, TrendingUp, Heart, Brain, Target, Activity, Sparkles, Users, Plane } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";

export default function DealsOffers() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const latestActions = getLatestActions(2);

  // Flash Deals Data
  const flashDeals = [
    {
      id: 1,
      title: "Wellness Weekend Package",
      description: "Spa, massage, and meditation retreat",
      originalPrice: "$450",
      price: "$299",
      savings: "$151",
      discount: 34,
      timeLeft: "2 hours 45 minutes",
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
      provider: "Luna Wellness Spa",
      rating: 4.9,
      sold: 67,
      limit: 100,
      category: "Package Deal"
    },
    {
      id: 2,
      title: "NAD+ IV Therapy Session",
      description: "Cellular regeneration therapy",
      originalPrice: "$250",
      price: "$149",
      savings: "$101",
      discount: 40,
      timeLeft: "6 hours 12 minutes",
      image: "/lovable-uploads/dr-roberts-avatar.jpg",
      provider: "Recovery Lab",
      rating: 4.8,
      sold: 23,
      limit: 50,
      category: "Flash Sale"
    }
  ];

  // Trending Services Data  
  const trendingServices = [
    {
      id: 1,
      title: "Cold Plunge Therapy",
      description: "30-minute cold water immersion session",
      price: "$75",
      image: "/lovable-uploads/james-davis-avatar.jpg",
      rating: 4.9,
      bookings: 234,
      trend: "+45%",
      location: "Downtown Wellness Center",
      timeSlots: ["2PM", "4PM", "6PM"]
    },
    {
      id: 2,
      title: "Sound Healing Bowl Session",
      description: "Tibetan singing bowl meditation experience",
      price: "$95",
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
      rating: 4.8,
      bookings: 189,
      trend: "+38%",
      location: "Zen Wellness Studio",
      timeSlots: ["11AM", "3PM", "7PM"]
    }
  ];

  // AI Recommendations Data
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
    }
  ];

  // Saved Items Data
  const savedProducts = [
    {
      id: 1,
      title: "Yoga Meditation Cushion",
      description: "Organic cotton with buckwheat hull filling",
      price: "$89",
      originalPrice: "$89",
      priceChange: "same",
      image: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png",
      rating: 4.6,
      inStock: true,
      savedDate: "3 days ago"
    },
    {
      id: 2,
      title: "Mindfulness Starter Kit",
      description: "Essential oils, crystals, and guided meditation",
      price: "$149",
      originalPrice: "$179",
      priceChange: "down",
      savings: "$30",
      image: "/lovable-uploads/murphy-avatar.jpg",
      rating: 4.8,
      inStock: true,
      savedDate: "1 week ago"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Deals & Offers | Discover" description="Limited-time deals, trending services, AI recommendations, and saved items" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Deals & Offers 🔥</h1>
                <p className="text-muted-foreground">Limited-time deals, trending services, AI recommendations, and saved items.</p>
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

          {/* 4-Panel Horizontal Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
            
            {/* Flash Deals Panel */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-semibold">Flash Deals</h3>
                <Badge className="bg-red-500 text-white">
                  <Timer className="h-3 w-3 mr-1" />
                  Limited
                </Badge>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {flashDeals.map((deal) => (
                  <Card key={deal.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-red-200">
                    <div className="relative">
                      <img 
                        src={deal.image} 
                        alt={deal.title}
                        className="w-full h-24 object-cover rounded-t-lg"
                      />
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
                        -{deal.discount}%
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {deal.title}
                      </h4>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold text-red-600">{deal.price}</span>
                          <span className="text-sm text-muted-foreground line-through">{deal.originalPrice}</span>
                        </div>
                      </div>
                      <p className="text-xs text-red-600 mb-2">{deal.timeLeft} left</p>
                      <Button size="sm" className="w-full bg-red-500 hover:bg-red-600 text-xs">Claim Deal</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Trending Panel */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">Trending</h3>
                <Badge className="bg-orange-100 text-orange-700">Hot</Badge>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {trendingServices.map((service) => (
                  <Card key={service.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div className="relative">
                      <img 
                        src={service.image} 
                        alt={service.title}
                        className="w-full h-24 object-cover rounded-t-lg"
                      />
                      <Badge className="absolute top-2 left-2 bg-orange-500 text-white text-xs">
                        {service.trend}
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {service.title}
                      </h4>
                      <div className="flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{service.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{service.price}</span>
                        <Button size="sm" className="text-xs">Book Now</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* AI Picks Panel */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold">AI Picks</h3>
                <Badge className="bg-purple-100 text-purple-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  For You
                </Badge>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {personalizedMatches.map((match) => (
                  <Card key={match.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200">
                    <div className="relative">
                      <img 
                        src={match.image} 
                        alt={match.title}
                        className="w-full h-24 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1">
                        <span className="text-xs font-bold text-purple-600">{match.match}%</span>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {match.title}
                      </h4>
                      <div className="bg-purple-50 p-2 rounded-lg mb-2">
                        <div className="flex items-center gap-1">
                          <Brain className="h-3 w-3 text-purple-500" />
                          <span className="text-xs text-purple-700 font-medium">{match.reason}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-foreground">{match.price}</span>
                          {match.period && <span className="text-xs text-muted-foreground">{match.period}</span>}
                        </div>
                        <Button size="sm" className="text-xs">Book</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Saved Items Panel */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-pink-500" />
                <h3 className="text-lg font-semibold">Saved Items</h3>
                <Badge className="bg-pink-100 text-pink-700">{savedProducts.length}</Badge>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {savedProducts.map((product) => (
                  <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div className="relative">
                      <img 
                        src={product.image} 
                        alt={product.title}
                        className="w-full h-24 object-cover rounded-t-lg"
                      />
                      {product.priceChange === "down" && (
                        <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Drop!
                        </Badge>
                      )}
                      <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/80 hover:bg-white h-6 w-6">
                        <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                      </Button>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {product.title}
                      </h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-sm font-bold ${
                            product.priceChange === "down" ? "text-green-600" : "text-foreground"
                          }`}>
                            {product.price}
                          </span>
                          {product.priceChange === "down" && (
                            <span className="text-xs text-muted-foreground line-through">{product.originalPrice}</span>
                          )}
                        </div>
                        <Button size="sm" className="text-xs">Add to Cart</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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