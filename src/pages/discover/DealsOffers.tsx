import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { discoverNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Flame, Percent, Package, Star, MapPin, Clock, TrendingDown, TrendingUp, Heart, Brain, Target, Activity, Sparkles, Users, Plane, Plus, RefreshCw } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { MasterActionPopup } from "@/components/MasterActionPopup";

export default function DealsOffers() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);

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
          <StandardHeader
            title="Deals & Offers"
            description="Limited-time deals, trending services, AI recommendations, and saved items"
            emoji="🔥"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search deals and offers…"
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
                      <div className="flex gap-2">
                        <AddToCartButton
                          item={{
                            item_type: 'deal',
                            item_id: deal.id.toString(),
                            item_name: deal.title,
                            item_price: parseFloat(deal.price.replace('$', '')),
                            item_image_url: deal.image,
                            item_metadata: {
                              originalPrice: deal.originalPrice,
                              discount: deal.discount,
                              provider: deal.provider,
                            },
                          }}
                          size="sm"
                          className="flex-1 text-xs"
                          showLabel={false}
                        />
                        <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600 text-xs">Claim Deal</Button>
                      </div>
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-foreground">{service.price}</span>
                        <div className="flex gap-1">
                          <AddToCartButton
                            item={{
                              item_type: 'wellness_service',
                              item_id: service.id.toString(),
                              item_name: service.title,
                              item_price: parseFloat(service.price.replace('$', '')),
                              item_image_url: service.image,
                              item_metadata: {
                                location: service.location,
                                bookings: service.bookings,
                                trend: service.trend,
                              },
                            }}
                            size="sm"
                            className="text-xs"
                            showLabel={false}
                          />
                          <Button size="sm" className="text-xs">Book Now</Button>
                        </div>
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-foreground">{match.price}</span>
                          {match.period && <span className="text-xs text-muted-foreground">{match.period}</span>}
                        </div>
                        <div className="flex gap-1">
                          <AddToCartButton
                            item={{
                              item_type: 'wellness_service',
                              item_id: match.id.toString(),
                              item_name: match.title,
                              item_price: parseFloat(match.price.replace('$', '')),
                              item_image_url: match.image,
                              item_metadata: {
                                match: match.match,
                                reason: match.reason,
                                provider: match.provider,
                              },
                            }}
                            size="sm"
                            className="text-xs"
                            showLabel={false}
                          />
                          <Button size="sm" className="text-xs">Book</Button>
                        </div>
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
      <MasterActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
    </AppLayout>
  );
}