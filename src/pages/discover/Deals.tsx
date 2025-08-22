import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Flame, Percent, Package, Star, MapPin, Clock, TrendingDown } from "lucide-react";

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

export default function Deals() {
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
      image: "/public/placeholder.svg",
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
      image: "/public/placeholder.svg",
      provider: "Recovery Lab",
      rating: 4.8,
      sold: 23,
      limit: 50,
      category: "Flash Sale"
    }
  ];

  const weeklyDeals = [
    {
      id: 1,
      title: "Monthly Yoga Unlimited",
      description: "Access to all classes for 30 days",
      originalPrice: "$150",
      price: "$89",
      savings: "$61",
      discount: 41,
      timeLeft: "5 days",
      image: "/public/placeholder.svg",
      provider: "Zen Studio",
      rating: 4.7,
      category: "Weekly Deal"
    },
    {
      id: 2,
      title: "Sleep Optimization Program",
      description: "4-week sleep improvement course",
      originalPrice: "$299",
      price: "$199",
      savings: "$100",
      discount: 33,
      timeLeft: "3 days",
      image: "/public/placeholder.svg",
      provider: "Dr. Sleep Clinic",
      rating: 4.9,
      category: "Weekly Deal"
    },
    {
      id: 3,
      title: "Nutrition Reset Bundle",
      description: "Consultation + meal plan + supplements",
      originalPrice: "$399",
      price: "$279",
      savings: "$120",
      discount: 30,
      timeLeft: "6 days",
      image: "/public/placeholder.svg",
      provider: "Wellness Nutrition Co.",
      rating: 4.6,
      category: "Bundle Deal"
    }
  ];

  const bundleDeals = [
    {
      id: 1,
      title: "Complete Wellness Starter",
      description: "Fitness tracker + nutrition consultation + yoga classes",
      originalPrice: "$379",
      bundlePrice: "$299",
      savings: "$80",
      items: ["Vitana Tracker Pro", "Nutrition Consultation", "30-Day Yoga Pass"],
      image: "/public/placeholder.svg",
      rating: 4.8
    },
    {
      id: 2,
      title: "Mental Wellness Package",
      description: "Meditation app + therapy sessions + stress relief kit",
      originalPrice: "$249",
      bundlePrice: "$199",
      savings: "$50",
      items: ["Premium Meditation App", "3 Therapy Sessions", "Stress Relief Kit"],
      image: "/public/placeholder.svg",
      rating: 4.7
    },
    {
      id: 3,
      title: "Recovery & Performance Bundle",
      description: "Massage + cold plunge + red light therapy",
      originalPrice: "$450",
      bundlePrice: "$349",
      savings: "$101",
      items: ["90-min Massage", "Cold Plunge Session", "Red Light Therapy"],
      image: "/public/placeholder.svg",
      rating: 4.9
    }
  ];

  return (
    <AppLayout>
      <SEO title="Deals & Offers | Discover" description="Limited-time deals and special offers on wellness services" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Special Offers & Deals"
            description="Discover limited-time promotions, bundle packages, and exclusive discounts on wellness services."
            icon={Percent}
          />

          {/* Filters */}
          <div className="bg-background/95 backdrop-blur-sm rounded-xl p-6 shadow-sm border mb-8">
            <div className="flex flex-wrap gap-3">
              <Select>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Deal Type" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Deals</SelectItem>
                  <SelectItem value="flash">Flash Sales</SelectItem>
                  <SelectItem value="weekly">Weekly Deals</SelectItem>
                  <SelectItem value="bundle">Bundle Packages</SelectItem>
                  <SelectItem value="new">New Customer</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Discount" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Any Discount</SelectItem>
                  <SelectItem value="20">20%+ Off</SelectItem>
                  <SelectItem value="30">30%+ Off</SelectItem>
                  <SelectItem value="50">50%+ Off</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="therapy">Therapies</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flash Deals */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Flame className="h-6 w-6 text-red-500" />
              <h2 className="text-2xl font-semibold text-foreground">Flash Deals</h2>
              <Badge className="bg-red-500 text-white">
                <Timer className="h-3 w-3 mr-1" />
                Limited Time
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flashDeals.map((deal) => (
                <Card key={deal.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-red-200">
                  <div className="relative">
                    <img 
                      src={deal.image} 
                      alt={deal.title}
                      className="w-full h-48 object-cover rounded-t-lg"
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
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex-1">
                        {deal.title}
                      </h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{deal.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{deal.description}</p>
                    <div className="flex items-center gap-1 mb-4">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{deal.provider}</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-red-600">{deal.price}</span>
                        <span className="text-lg text-muted-foreground line-through">{deal.originalPrice}</span>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          Save {deal.savings}
                        </Badge>
                      </div>
                    </div>
                    {deal.limit && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Claimed: {deal.sold}/{deal.limit}</span>
                          <span>{Math.round((deal.sold / deal.limit) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(deal.sold / deal.limit) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Button className="w-full bg-red-500 hover:bg-red-600">Claim Deal</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Weekly Deals */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendingDown className="h-6 w-6 text-green-500" />
              <h2 className="text-2xl font-semibold text-foreground">Weekly Deals</h2>
              <Badge variant="outline" className="text-green-600 border-green-200">
                This Week Only
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {weeklyDeals.map((deal) => (
                <Card key={deal.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit">
                  <div className="relative">
                    <img 
                      src={deal.image} 
                      alt={deal.title}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1">
                      -{deal.discount}%
                    </Badge>
                  </div>
                  <CardContent className="p-3 h-fit">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
                          {deal.title}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">{deal.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{deal.description}</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{deal.provider}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-green-600">{deal.price}</span>
                          <span className="text-xs text-muted-foreground line-through">{deal.originalPrice}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-orange-500 flex-shrink-0" />
                        <span className="text-xs text-orange-600 truncate">{deal.timeLeft} left</span>
                      </div>
                      <Button size="sm" className="w-full text-xs h-7 mt-2 bg-green-500 hover:bg-green-600">
                        Get Deal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Bundle Packages */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-6 w-6 text-purple-500" />
              <h2 className="text-2xl font-semibold text-foreground">Bundle Packages</h2>
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                Best Value
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bundleDeals.map((bundle) => (
                <Card key={bundle.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200">
                  <div className="relative">
                    <img 
                      src={bundle.image} 
                      alt={bundle.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 left-3 bg-purple-500 text-white">
                      Bundle Deal
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex-1">
                        {bundle.title}
                      </h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{bundle.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{bundle.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="text-xs font-medium text-muted-foreground">Includes:</div>
                      {bundle.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-xs text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-purple-600">{bundle.bundlePrice}</span>
                        <span className="text-lg text-muted-foreground line-through">{bundle.originalPrice}</span>
                      </div>
                      <Badge className="bg-purple-500 text-white">
                        Save {bundle.savings}
                      </Badge>
                    </div>
                    <Button className="w-full bg-purple-500 hover:bg-purple-600">Get Bundle</Button>
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