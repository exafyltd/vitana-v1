import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, TrendingUp, Flame, Users, Heart, Timer } from "lucide-react";

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

export default function Trending() {
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
    },
    {
      id: 3,
      title: "Breathwork Intensive",
      description: "90-minute guided breathing workshop",
      price: "$120",
      image: "/lovable-uploads/mike-thompson-avatar.jpg",
      rating: 4.9,
      bookings: 156,
      trend: "+52%",
      location: "Mindful Movement Space",
      timeSlots: ["9AM", "2PM", "5PM"]
    }
  ];

  const hotDeals = [
    {
      id: 1,
      title: "Wellness Weekend Package",
      description: "Spa, massage, and meditation retreat",
      price: "$299",
      originalPrice: "$450",
      timeLeft: "2 days",
      image: "/lovable-uploads/lisa-chen-avatar.jpg",
      sold: 67,
      limit: 100
    },
    {
      id: 2,
      title: "Monthly Yoga Unlimited",
      description: "Access to all classes for 30 days",
      price: "$89",
      originalPrice: "$150",
      timeLeft: "5 hours",
      image: "/lovable-uploads/sarah-miller-avatar.jpg",
      sold: 43,
      limit: 50
    }
  ];

  const trendingProducts = [
    {
      id: 1,
      title: "Adaptogenic Stress Relief Blend",
      description: "Ashwagandha & rhodiola supplement",
      price: "$49",
      image: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png",
      rating: 4.7,
      orders: 1234,
      trend: "+67%"
    },
    {
      id: 2,
      title: "Infrared Therapy Mat",
      description: "Full-body healing mat with gemstones",
      price: "$399",
      image: "/lovable-uploads/murphy-avatar.jpg",
      rating: 4.8,
      orders: 456,
      trend: "+89%"
    },
    {
      id: 3,
      title: "Meditation Cushion Set",
      description: "Organic cotton with buckwheat fill",
      price: "$89",
      image: "/lovable-uploads/tae-min-avatar.jpg",
      rating: 4.6,
      orders: 789,
      trend: "+34%"
    }
  ];

  const trendingProviders = [
    {
      id: 1,
      name: "Maya Wellness Collective",
      specialty: "Holistic Health Coaching",
      bookings: 89,
      trend: "+156%",
      rating: 4.9,
      image: "/lovable-uploads/design-team-avatar.jpg",
      location: "Virtual & NYC"
    },
    {
      id: 2,
      name: "Peak Performance Lab",
      specialty: "Biohacking & Optimization",
      bookings: 67,
      trend: "+123%",
      rating: 4.8,
      image: "/lovable-uploads/se-hun-oh-avatar.jpg",
      location: "San Francisco"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Trending | Discover" description="See what's trending now in longevity" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Trending Now"
            description="Most popular longevity services and products this week"
            icon={Flame}
          />

          {/* Most Booked Services */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-orange-500" />
                Most Booked Services
              </h2>
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <Flame className="h-3 w-3 mr-1" />
                Hot This Week
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {trendingServices.map((service) => (
                <Card key={service.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit">
                  <div className="relative">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-32 md:h-36 lg:h-40 xl:h-44 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {service.trend}
                    </Badge>
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/80 hover:bg-white h-7 w-7">
                      <Heart className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardContent className="p-3 md:p-4 lg:p-5 h-fit">
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-xs md:text-sm lg:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
                          {service.title}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs md:text-sm text-muted-foreground">{service.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{service.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-green-600 truncate">{service.bookings} bookings</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{service.price}</span>
                        <div className="flex gap-1">
                          {service.timeSlots.slice(0, 2).map((time) => (
                            <Badge key={time} variant="outline" className="text-xs px-1">{time}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button size="sm" className="w-full text-xs md:text-sm h-7 md:h-8 lg:h-9 mt-2">Book Now</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Hot Deals */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Timer className="h-6 w-6 text-red-500" />
                Hot Deals
              </h2>
              <Badge variant="outline" className="text-red-600 border-red-200">
                Limited Time
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hotDeals.map((deal) => (
                <Card key={deal.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-red-200">
                  <div className="relative">
                    <img 
                      src={deal.image} 
                      alt={deal.title}
                      className="w-full h-32 md:h-40 lg:h-44 xl:h-48 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                      <Timer className="h-3 w-3 mr-1" />
                      {deal.timeLeft} left
                    </Badge>
                  </div>
                  <CardContent className="p-3 md:p-4 lg:p-5">
                    <h3 className="font-semibold text-sm md:text-base lg:text-lg text-foreground mb-2 md:mb-3 group-hover:text-primary transition-colors">{deal.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">{deal.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-red-600">{deal.price}</span>
                        <span className="text-lg text-muted-foreground line-through">{deal.originalPrice}</span>
                      </div>
                      <Badge variant="outline" className="text-red-600">
                        {Math.round((1 - parseInt(deal.price.slice(1)) / parseInt(deal.originalPrice.slice(1))) * 100)}% OFF
                      </Badge>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Sold: {deal.sold}/{deal.limit}</span>
                        <span>{Math.round((deal.sold / deal.limit) * 100)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(deal.sold / deal.limit) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Button className="w-full bg-red-500 hover:bg-red-600 h-7 md:h-8 lg:h-9 text-xs md:text-sm">Claim Deal</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Trending Products */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Top-Selling Products</h2>
              <Button variant="outline" size="sm">View All Products</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {trendingProducts.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit">
                  <div className="relative">
                    <img 
                      src={product.image} 
                      alt={product.title}
                      className="w-full h-32 md:h-36 lg:h-40 xl:h-44 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {product.trend}
                    </Badge>
                  </div>
                  <CardContent className="p-3 md:p-4 lg:p-5 h-fit">
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-xs md:text-sm lg:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
                          {product.title}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs md:text-sm text-muted-foreground">{product.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-600 truncate">{product.orders} orders</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{product.price}</span>
                        <Button size="sm" className="text-xs md:text-sm h-7 md:h-8 lg:h-9">Add to Cart</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Trending Providers */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Rising Providers</h2>
              <Button variant="outline" size="sm">View All Providers</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trendingProviders.map((provider) => (
                <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <img 
                        src={provider.image} 
                        alt={provider.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{provider.name}</h3>
                          <Badge className="bg-green-500 text-white">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {provider.trend}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{provider.specialty}</p>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{provider.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{provider.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">{provider.bookings} new bookings</span>
                          </div>
                          <Button size="sm">View Profile</Button>
                        </div>
                      </div>
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