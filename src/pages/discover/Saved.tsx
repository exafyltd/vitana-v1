import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Heart, ShoppingCart, Calendar, TrendingDown, TrendingUp, Package, AlertCircle } from "lucide-react";

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

export default function Saved() {
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
    },
    {
      id: 3,
      title: "Resistance Band Set",
      description: "5-piece professional workout bands",
      price: "$45",
      originalPrice: "$39",
      priceChange: "up",
      image: "/lovable-uploads/james-davis-avatar.jpg",
      rating: 4.4,
      inStock: false,
      savedDate: "2 weeks ago",
      restockDate: "Next Monday"
    }
  ];

  const savedServices = [
    {
      id: 1,
      title: "Deep Tissue Massage",
      description: "90-minute therapeutic massage session",
      price: "$120",
      provider: "Zen Wellness Spa",
      rating: 4.9,
      reviews: 234,
      nextAvailable: "Today 4PM",
      image: "/lovable-uploads/tae-min-avatar.jpg",
      savedDate: "2 days ago"
    },
    {
      id: 2,
      title: "Nutrition Consultation",
      description: "1-hour personalized meal planning session",
      price: "$95",
      provider: "Dr. Sarah Chen",
      rating: 4.8,
      reviews: 156,
      nextAvailable: "Tomorrow 2PM",
      image: "/lovable-uploads/dr-roberts-avatar.jpg",
      savedDate: "5 days ago"
    },
    {
      id: 3,
      title: "Breathwork Workshop",
      description: "Group session for stress relief and focus",
      price: "$55",
      provider: "Mindful Movement Studio",
      rating: 4.7,
      reviews: 89,
      nextAvailable: "Friday 6PM",
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
      savedDate: "1 week ago"
    }
  ];

  const priceAlerts = [
    {
      id: 1,
      title: "Infrared Sauna Session",
      oldPrice: "$65",
      newPrice: "$45",
      savings: "$20",
      provider: "Recovery Lab",
      timeLeft: "2 days"
    },
    {
      id: 2,
      title: "Acupuncture Treatment",
      oldPrice: "$110",
      newPrice: "$85",
      savings: "$25",
      provider: "Holistic Health Center",
      timeLeft: "1 week"
    }
  ];

  const availabilityAlerts = [
    {
      id: 1,
      title: "Dr. Maya Wellness",
      service: "Health Coaching Session",
      newSlots: ["Today 3PM", "Tomorrow 10AM", "Friday 2PM"],
      provider: "Maya Wellness Collective"
    },
    {
      id: 2,
      title: "Hot Yoga Class",
      service: "Power Flow Session",
      newSlots: ["Tonight 7PM", "Tomorrow 6AM"],
      provider: "Heat Yoga Studio"
    }
  ];

  const bundleSuggestions = [
    {
      id: 1,
      title: "Saved Items Bundle",
      description: "Combine your saved meditation kit + cushion",
      originalTotal: "$268",
      bundlePrice: "$219",
      savings: "$49",
      items: ["Mindfulness Starter Kit", "Yoga Meditation Cushion"]
    }
  ];

  return (
    <AppLayout>
      <SEO title="Saved Items | Discover" description="Your saved longevity products and services" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Saved Items"
            description="Your bookmarked longevity products, services, and providers"
            icon={Heart}
          />

          {/* Price Drop Alerts */}
          {priceAlerts.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-green-500" />
                <h2 className="text-xl font-semibold text-foreground">Price Drop Alerts</h2>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {priceAlerts.length} deals
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {priceAlerts.map((alert) => (
                  <Card key={alert.id} className="border-green-200 bg-green-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{alert.title}</h3>
                        <Badge className="bg-green-500 text-white">Save {alert.savings}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{alert.provider}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-green-600">{alert.newPrice}</span>
                          <span className="text-sm text-muted-foreground line-through">{alert.oldPrice}</span>
                        </div>
                        <div className="text-right">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600">Book Now</Button>
                          <p className="text-xs text-muted-foreground mt-1">Ends in {alert.timeLeft}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Availability Alerts */}
          {availabilityAlerts.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-blue-500" />
                <h2 className="text-xl font-semibold text-foreground">New Availability</h2>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {availabilityAlerts.length} updates
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availabilityAlerts.map((alert) => (
                  <Card key={alert.id} className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-1">{alert.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{alert.service} at {alert.provider}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {alert.newSlots.map((slot, index) => (
                          <Badge key={index} variant="outline" className="text-blue-600 border-blue-200">
                            {slot}
                          </Badge>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                        Book Appointment
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Bundle Suggestions */}
          {bundleSuggestions.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-purple-500" />
                <h2 className="text-xl font-semibold text-foreground">Bundle Suggestions</h2>
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  Save More
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {bundleSuggestions.map((bundle) => (
                  <Card key={bundle.id} className="border-purple-200 bg-purple-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-2">{bundle.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{bundle.description}</p>
                          <div className="space-y-1 mb-3">
                            {bundle.items.map((item, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-sm text-muted-foreground">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl font-bold text-purple-600">{bundle.bundlePrice}</span>
                            <span className="text-lg text-muted-foreground line-through">{bundle.originalTotal}</span>
                          </div>
                          <Badge className="bg-purple-500 text-white mb-2">Save {bundle.savings}</Badge>
                          <br />
                          <Button size="sm" className="bg-purple-500 hover:bg-purple-600">Create Bundle</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Saved Products */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Saved Products</h2>
              <Badge variant="outline">{savedProducts.length} items</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {savedProducts.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit">
                  <div className="relative">
                    <img 
                      src={product.image} 
                      alt={product.title}
                      className="w-full h-32 md:h-36 lg:h-40 xl:h-44 object-cover rounded-t-lg"
                    />
                    {product.priceChange === "down" && (
                      <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Drop!
                      </Badge>
                    )}
                    {product.priceChange === "up" && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Up
                      </Badge>
                    )}
                    {!product.inStock && (
                      <Badge className="absolute top-2 left-2 bg-gray-500 text-white text-xs px-2 py-1">
                        Out
                      </Badge>
                    )}
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/80 hover:bg-white h-7 w-7">
                      <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                    </Button>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-sm font-bold ${
                            product.priceChange === "down" ? "text-green-600" : 
                            product.priceChange === "up" ? "text-red-600" : "text-foreground"
                          }`}>
                            {product.price}
                          </span>
                          {product.priceChange === "down" && (
                            <span className="text-xs text-muted-foreground line-through">{product.originalPrice}</span>
                          )}
                        </div>
                        {product.savings && (
                          <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                            -{product.savings}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">Saved {product.savedDate}</div>
                      {product.inStock ? (
                        <Button size="sm" className="w-full text-xs md:text-sm h-7 md:h-8 lg:h-9 mt-2">
                          <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                          Add to Cart
                        </Button>
                      ) : (
                        <div className="space-y-1">
                          <Button size="sm" className="w-full text-xs md:text-sm h-7 md:h-8 lg:h-9" variant="outline" disabled>
                            <AlertCircle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            Out of Stock
                          </Button>
                          <div className="text-xs md:text-sm text-center text-muted-foreground">
                            Restocking {product.restockDate}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Saved Services */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Saved Services</h2>
              <Badge variant="outline">{savedServices.length} services</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {savedServices.map((service) => (
                <Card key={service.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit">
                  <div className="relative">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-32 md:h-36 lg:h-40 xl:h-44 object-cover rounded-t-lg"
                    />
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/80 hover:bg-white h-7 w-7">
                      <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
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
                        <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs md:text-sm text-muted-foreground truncate">{service.provider}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs md:text-sm text-green-600 truncate">{service.nextAvailable}</span>
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">Saved {service.savedDate}</div>
                       <div className="flex items-center justify-between">
                         <span className="text-sm md:text-base font-bold text-foreground">{service.price}</span>
                         <Button size="sm" className="text-xs md:text-sm h-7 md:h-8 lg:h-9">
                           <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                           Book
                         </Button>
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