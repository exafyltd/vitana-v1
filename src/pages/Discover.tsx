import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Bookmark, MapPin, Clock, Users, Zap, Calendar, ShoppingCart, Heart } from "lucide-react";

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
      title: "Summer Wellness Retreat",
      description: "7-day mindfulness and yoga retreat in Bali",
      price: "$1,299",
      originalPrice: "$1,599",
      image: "/public/placeholder.svg",
      rating: 4.9,
      location: "Bali, Indonesia",
      available: "Starting July 15"
    },
    {
      id: 2,
      title: "Personal Health Coach",
      description: "1-on-1 wellness coaching with certified expert",
      price: "$89",
      period: "/session",
      image: "/public/placeholder.svg",
      rating: 4.8,
      location: "Online/Local",
      available: "Available today"
    },
    {
      id: 3,
      title: "Meditation Starter Kit",
      description: "Complete package with cushion, crystals & guide",
      price: "$149",
      originalPrice: "$199",
      image: "/public/placeholder.svg",
      rating: 4.7,
      inStock: true,
      shipping: "Free shipping"
    }
  ];

  const quickActions = [
    {
      title: "Book Massage",
      subtitle: "Next available: Today 3PM",
      icon: Calendar,
      action: "Book Now",
      color: "bg-blue-500"
    },
    {
      title: "Order Supplements",
      subtitle: "Your usual vitamin D is low",
      icon: ShoppingCart,
      action: "Reorder",
      color: "bg-green-500"
    },
    {
      title: "Join Challenge",
      subtitle: "30-day mindfulness starts Monday",
      icon: Users,
      action: "Join",
      color: "bg-purple-500"
    }
  ];

  const topProviders = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      specialty: "Holistic Medicine",
      rating: 4.9,
      reviews: 156,
      nextAvailable: "Today 2PM",
      image: "/public/placeholder.svg",
      badge: "Top Rated"
    },
    {
      id: 2,
      name: "Marcus Rodriguez",
      specialty: "Fitness Coach",
      rating: 4.8,
      reviews: 89,
      nextAvailable: "Tomorrow 9AM",
      image: "/public/placeholder.svg",
      badge: "Trending"
    },
    {
      id: 3,
      name: "Luna Wellness Spa",
      specialty: "Massage Therapy",
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Wellness Marketplace</h1>
            <p className="text-muted-foreground">Discover services, products, and providers perfectly matched to your wellness journey.</p>
          </div>

          {/* Featured Offers */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Featured Offers</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/discover/trending')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredOffers.map((offer) => (
                <Card key={offer.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="relative">
                    <img 
                      src={offer.image} 
                      alt={offer.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {offer.originalPrice && (
                      <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                        Save {Math.round((1 - parseInt(offer.price.slice(1)) / parseInt(offer.originalPrice.slice(1))) * 100)}%
                      </Badge>
                    )}
                    <Button size="icon" variant="ghost" className="absolute top-3 right-3 bg-white/80 hover:bg-white">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{offer.title}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">{offer.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{offer.description}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{offer.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">{offer.price}</span>
                        {offer.period && <span className="text-sm text-muted-foreground">{offer.period}</span>}
                        {offer.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">{offer.originalPrice}</span>
                        )}
                      </div>
                      <Button size="sm">Book Now</Button>
                    </div>
                    {offer.available && (
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">{offer.available}</span>
                      </div>
                    )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topProviders.map((provider) => (
                <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4 mb-4">
                      <img 
                        src={provider.image} 
                        alt={provider.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{provider.name}</h3>
                          <Badge variant="secondary" className="text-xs">{provider.badge}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{provider.specialty}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{provider.rating}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">({provider.reviews} reviews)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">{provider.nextAvailable}</span>
                      </div>
                      <Button size="sm">Book Session</Button>
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
                { title: "Trending Now", description: "Most popular services this week", icon: TrendingUp, path: "/discover/trending", count: "42 new" },
                { title: "For You", description: "AI-powered recommendations", icon: Star, path: "/discover/recommendations", count: "12 matches" },
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