import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Clock, Heart, ShoppingCart, Search, Filter, Grid, List } from "lucide-react";

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

export default function BrowseAll() {
  const allItems = [
    {
      id: 1,
      title: "Longevity Health Assessment",
      description: "Complete biomarker analysis & optimization plan",
      price: "$299",
      originalPrice: "$399",
      image: "/lovable-uploads/dr-roberts-avatar.jpg",
      rating: 4.9,
      location: "NYC Longevity Center",
      available: "Next week",
      category: "doctor",
      type: "service"
    },
    {
      id: 2,
      title: "NAD+ IV Therapy",
      description: "Cellular regeneration therapy session",
      price: "$189",
      period: "/session",
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
      rating: 4.8,
      location: "Wellness Clinic",
      available: "Available today",
      category: "therapy",
      type: "service"
    },
    {
      id: 3,
      title: "Red Light Therapy Device",
      description: "Professional-grade home photobiomodulation",
      price: "$599",
      originalPrice: "$799",
      image: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png",
      rating: 4.7,
      inStock: true,
      shipping: "Free shipping",
      category: "product",
      type: "product"
    },
    {
      id: 4,
      title: "Functional Fitness Training",
      description: "Movement patterns for longevity & vitality",
      price: "$75",
      period: "/session",
      image: "/lovable-uploads/mike-thompson-avatar.jpg",
      rating: 4.6,
      location: "Online/Local",
      available: "Tomorrow 9AM",
      category: "fitness",
      type: "service"
    },
    {
      id: 5,
      title: "Mindfulness for Longevity",
      description: "Stress reduction techniques for healthy aging",
      price: "$55",
      period: "/session",
      image: "/lovable-uploads/lisa-chen-avatar.jpg",
      rating: 4.8,
      location: "Zen Wellness Center",
      available: "Today 3PM",
      category: "mental",
      type: "service"
    },
    {
      id: 6,
      title: "Adaptogenic Stress Relief Blend",
      description: "Ashwagandha & rhodiola supplement",
      price: "$49",
      image: "/lovable-uploads/se-hun-oh-avatar.jpg",
      rating: 4.7,
      inStock: true,
      category: "product",
      type: "product"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Browse All | Discover" description="Browse all wellness services and products" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Browse All Services"
            description="Explore our complete catalog of longevity services, products, and wellness solutions."
            icon={Search}
          />

          {/* Enhanced Filters */}
          <div className="bg-background/95 backdrop-blur-sm rounded-xl p-6 shadow-sm border mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-3">
                <Select>
                  <SelectTrigger className="w-[140px] bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="doctor">Doctors</SelectItem>
                    <SelectItem value="therapy">Therapies</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="mental">Mental Health</SelectItem>
                    <SelectItem value="product">Products</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-[120px] bg-background">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="travel">Travel Required</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-[100px] bg-background">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="0-50">$0 - $50</SelectItem>
                    <SelectItem value="50-150">$50 - $150</SelectItem>
                    <SelectItem value="150+">$150+</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-[100px] bg-background">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">Any Rating</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    <SelectItem value="4.0">4.0+ Stars</SelectItem>
                    <SelectItem value="3.5">3.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Grid className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {allItems.length} results
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {allItems.map((item) => (
              <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full">
                <div className="relative">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-32 md:h-36 lg:h-40 xl:h-44 object-cover rounded-t-lg"
                  />
                  <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/80 hover:bg-white h-7 w-7 md:h-8 md:w-8">
                    <Heart className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  {item.originalPrice && (
                    <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1">
                      -{Math.round((1 - parseInt(item.price.slice(1)) / parseInt(item.originalPrice.slice(1))) * 100)}%
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3 md:p-4 lg:p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2 md:mb-3">
                    <h3 className="font-semibold text-sm md:text-base lg:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs md:text-sm text-muted-foreground">{item.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2 md:mb-3">{item.description}</p>
                  <div className="flex items-center gap-1 mb-2 md:mb-3 min-h-[16px] md:min-h-[20px]">
                    {item.location && (
                      <>
                        <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs md:text-sm text-muted-foreground truncate">{item.location}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm md:text-base lg:text-lg font-bold text-foreground">{item.price}</span>
                      {item.period && <span className="text-xs md:text-sm text-muted-foreground">{item.period}</span>}
                      {item.originalPrice && (
                        <span className="text-xs md:text-sm text-muted-foreground line-through">{item.originalPrice}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-4 min-h-[16px] md:min-h-[20px]">
                    {item.available && (
                      <>
                        <Clock className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs md:text-sm text-green-600 truncate">{item.available}</span>
                      </>
                    )}
                  </div>
                  <Button size="sm" className="w-full text-xs md:text-sm h-7 md:h-8 lg:h-9 mt-auto">
                    {item.type === 'product' ? 'Add to Cart' : 'Book Now'}
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