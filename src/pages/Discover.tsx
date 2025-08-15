import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Star, Bookmark, MapPin, Clock, Users, Zap, Calendar, ShoppingCart, Heart, Filter, Stethoscope, Dumbbell, Music } from "lucide-react";

const discoverSubItems = [
  { id: "overview", name: "Overview", path: "/discover" },
  { id: "trending", name: "Trending", path: "/discover/trending" },
  { id: "recommendations", name: "Recommendations", path: "/discover/recommendations" },
  { id: "saved", name: "Saved", path: "/discover/saved" },
];

export default function Discover() {
  const navigate = useNavigate();

  const featuredOffers = [
    {
      id: 1,
      title: "Longevity Health Assessment",
      description: "Complete biomarker analysis & optimization plan",
      price: "$299",
      originalPrice: "$399",
      image: "/public/placeholder.svg",
      rating: 4.9,
      location: "NYC Longevity Center",
      available: "Next week",
      category: "doctor"
    },
    {
      id: 2,
      title: "NAD+ IV Therapy",
      description: "Cellular regeneration therapy session",
      price: "$189",
      period: "/session",
      image: "/public/placeholder.svg",
      rating: 4.8,
      location: "Wellness Clinic",
      available: "Available today",
      category: "therapy"
    },
    {
      id: 3,
      title: "Red Light Therapy Device",
      description: "Professional-grade home photobiomodulation",
      price: "$599",
      originalPrice: "$799",
      image: "/public/placeholder.svg",
      rating: 4.7,
      inStock: true,
      shipping: "Free shipping",
      category: "product"
    },
    {
      id: 4,
      title: "Functional Fitness Training",
      description: "Movement patterns for longevity & vitality",
      price: "$75",
      period: "/session",
      image: "/public/placeholder.svg",
      rating: 4.6,
      location: "Online/Local",
      available: "Tomorrow 9AM",
      category: "fitness"
    },
    {
      id: 5,
      title: "Mindfulness for Longevity",
      description: "Stress reduction techniques for healthy aging",
      price: "$55",
      period: "/session",
      image: "/public/placeholder.svg",
      rating: 4.8,
      location: "Zen Wellness Center",
      available: "Today 3PM",
      category: "mental"
    }
  ];

  const quickActions = [
    {
      title: "Book Blood Panel",
      subtitle: "Annual longevity check: Today 2PM",
      icon: Stethoscope,
      action: "Book Now",
      color: "bg-blue-500"
    },
    {
      title: "Reorder Supplements",
      subtitle: "Your NAD+ precursors are running low",
      icon: ShoppingCart,
      action: "Reorder",
      color: "bg-green-500"
    },
    {
      title: "Join Longevity Challenge",
      subtitle: "30-day healthy aging protocol starts Monday",
      icon: Users,
      action: "Join",
      color: "bg-purple-500"
    }
  ];

  const topProviders = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      specialty: "Longevity Medicine",
      rating: 4.9,
      reviews: 156,
      nextAvailable: "Today 2PM",
      image: "/public/placeholder.svg",
      badge: "Top Rated"
    },
    {
      id: 2,
      name: "Marcus Rodriguez",
      specialty: "Functional Fitness",
      rating: 4.8,
      reviews: 89,
      nextAvailable: "Tomorrow 9AM",
      image: "/public/placeholder.svg",
      badge: "Trending"
    },
    {
      id: 3,
      name: "Luna Wellness Spa",
      specialty: "Recovery Therapy",
      rating: 4.9,
      reviews: 234,
      nextAvailable: "Today 4PM",
      image: "/public/placeholder.svg",
      badge: "Near You"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Discover Overview | VITANA" description="Discover wellness services, products, and providers tailored to your needs" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Longevity Marketplace</h1>
            <p className="text-muted-foreground">Discover longevity services, products, and providers perfectly matched to your healthy aging journey.</p>
            
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Select>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="therapy">Therapies</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="mental">Mental Health</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="travel">Travel Required</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="0-50">$0 - $50</SelectItem>
                  <SelectItem value="50-150">$50 - $150</SelectItem>
                  <SelectItem value="150+">$150+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Featured Offers */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Featured Offers</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/discover/trending')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {featuredOffers.map((offer) => (
                <Card key={offer.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="relative">
                    <img 
                      src={offer.image} 
                      alt={offer.title}
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/80 hover:bg-white h-8 w-8">
                      <Heart className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    {offer.originalPrice && (
                      <Badge className="bg-red-500 text-white text-xs">
                        Save {Math.round((1 - parseInt(offer.price.slice(1)) / parseInt(offer.originalPrice.slice(1))) * 100)}%
                      </Badge>
                    )}
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">{offer.title}</h3>
                      <div className="flex items-center gap-1 ml-2">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{offer.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{offer.description}</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{offer.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-foreground">{offer.price}</span>
                        {offer.period && <span className="text-xs text-muted-foreground">{offer.period}</span>}
                        {offer.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through">{offer.originalPrice}</span>
                        )}
                      </div>
                    </div>
                    {offer.available && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600">{offer.available}</span>
                      </div>
                    )}
                    <Button size="sm" className="w-full text-xs h-7">Book Now</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Card key={index} className="hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`${action.color} p-3 rounded-lg`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.subtitle}</p>
                      </div>
                      <Button variant="outline" size="sm">{action.action}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Top Service Providers */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Top Service Providers</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/discover/recommendations')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {topProviders.map((provider) => (
                <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex flex-col items-center text-center mb-3">
                      <img 
                        src={provider.image} 
                        alt={provider.name}
                        className="w-12 h-12 rounded-full object-cover mb-2"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{provider.name}</h3>
                          <Badge variant="secondary" className="text-xs">{provider.badge}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{provider.specialty}</p>
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{provider.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">({provider.reviews})</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600">{provider.nextAvailable}</span>
                      </div>
                      <Button size="sm" className="w-full text-xs h-7">Book Session</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Explore Categories */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-6">Explore Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Trending Now", description: "Most popular longevity services this week", icon: TrendingUp, path: "/discover/trending", count: "42 new" },
                { title: "For You", description: "AI-powered longevity recommendations", icon: Star, path: "/discover/recommendations", count: "12 matches" },
                { title: "Saved Items", description: "Your bookmarked favorites", icon: Bookmark, path: "/discover/saved", count: "8 items" }
              ].map((category) => (
                <Card 
                  key={category.title}
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  onClick={() => navigate(category.path)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <category.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline">{category.count}</Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{category.title}</h3>
                    <p className="text-muted-foreground text-sm">{category.description}</p>
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