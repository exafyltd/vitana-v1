import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { ServiceDetailSplitScreen } from "@/components/ui/split-screen";
import { discoverNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timer, Flame, Percent, Package, Star, MapPin, Clock, TrendingDown, TrendingUp, Heart, Brain, Target, Activity, Sparkles, Users } from "lucide-react";

export default function DealsOffers() {
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

  // Left Panel Content
  const LeftPanelContent = (
    <div className="space-y-6">
      <Tabs defaultValue="flash-deals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flash-deals">Flash Deals</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>
        
        <TabsContent value="flash-deals" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold">Flash Deals</h3>
            <Badge className="bg-red-500 text-white">
              <Timer className="h-3 w-3 mr-1" />
              Limited Time
            </Badge>
          </div>
          <div className="grid gap-4">
            {flashDeals.map((deal) => (
              <Card key={deal.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-red-200">
                <div className="relative">
                  <img 
                    src={deal.image} 
                    alt={deal.title}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                  <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                    <Timer className="h-3 w-3 mr-1" />
                    {deal.timeLeft} left
                  </Badge>
                  <Badge className="absolute top-3 right-3 bg-red-500 text-white text-lg px-3 py-1">
                    -{deal.discount}%
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {deal.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">{deal.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-red-600">{deal.price}</span>
                      <span className="text-lg text-muted-foreground line-through">{deal.originalPrice}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{deal.rating}</span>
                    </div>
                  </div>
                  <Button className="w-full bg-red-500 hover:bg-red-600">Claim Deal</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Trending Services</h3>
          </div>
          <div className="grid gap-4">
            {trendingServices.map((service) => (
              <Card key={service.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="relative">
                  <img 
                    src={service.image} 
                    alt={service.title}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                  <Badge className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {service.trend}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {service.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                  <div className="flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{service.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">{service.price}</span>
                    <Button size="sm">Book Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Right Panel Content
  const RightPanelContent = (
    <div className="space-y-6">
      <Tabs defaultValue="ai-recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-recommendations">AI Picks</TabsTrigger>
          <TabsTrigger value="saved">Saved Items</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai-recommendations" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">AI Recommendations</h3>
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              Personalized
            </Badge>
          </div>
          <div className="grid gap-4">
            {personalizedMatches.map((match) => (
              <Card key={match.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200">
                <div className="relative">
                  <img 
                    src={match.image} 
                    alt={match.title}
                    className="w-full h-32 object-cover rounded-t-lg"
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
                <CardContent className="p-4">
                  <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {match.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">{match.description}</p>
                  <div className="bg-purple-50 p-2 rounded-lg mb-3">
                    <div className="flex items-center gap-1">
                      <Brain className="h-3 w-3 text-purple-500" />
                      <span className="text-xs text-purple-700 font-medium">{match.reason}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-foreground">{match.price}</span>
                      {match.period && <span className="text-xs text-muted-foreground">{match.period}</span>}
                    </div>
                    <Button size="sm">Book</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-pink-500" />
            <h3 className="text-lg font-semibold">Saved Items</h3>
          </div>
          <div className="grid gap-4">
            {savedProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="relative">
                  <img 
                    src={product.image} 
                    alt={product.title}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                  {product.priceChange === "down" && (
                    <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Price Drop!
                    </Badge>
                  )}
                  <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/80 hover:bg-white h-7 w-7">
                    <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-lg font-bold ${
                        product.priceChange === "down" ? "text-green-600" : "text-foreground"
                      }`}>
                        {product.price}
                      </span>
                      {product.priceChange === "down" && (
                        <span className="text-sm text-muted-foreground line-through">{product.originalPrice}</span>
                      )}
                    </div>
                    <Button size="sm">Add to Cart</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <AppLayout>
      <SEO title="Deals & Offers | Discover" description="Limited-time deals, trending services, AI recommendations, and saved items" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      
      <ServiceDetailSplitScreen
        leftTitle="Flash Deals & Trending"
        leftContent={LeftPanelContent}
        rightTitle="AI Picks & Saved Items"
        rightContent={RightPanelContent}
        screenId="deals-offers-split"
      />
    </AppLayout>
  );
}