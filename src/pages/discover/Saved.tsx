import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Heart, ShoppingCart, Calendar, TrendingDown, TrendingUp, Package, AlertCircle } from "lucide-react";

const discoverSubItems = [
  { id: "overview", name: "Overview", path: "/discover" },
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
      image: "/public/placeholder.svg",
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
      image: "/public/placeholder.svg",
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
      image: "/public/placeholder.svg",
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
      image: "/public/placeholder.svg",
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
      image: "/public/placeholder.svg",
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
      image: "/public/placeholder.svg",
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
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-pink-500 p-3 rounded-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Saved Items</h1>
              <p className="text-muted-foreground">Your bookmarked longevity products, services, and providers</p>
            </div>
          </div>

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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {savedProducts.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="relative">
                    <img 
                      src={product.image} 
                      alt={product.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {product.priceChange === "down" && (
                      <Badge className="absolute top-3 left-3 bg-green-500 text-white">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Price Drop!
                      </Badge>
                    )}
                    {product.priceChange === "up" && (
                      <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Price Increase
                      </Badge>
                    )}
                    {!product.inStock && (
                      <Badge className="absolute top-3 left-3 bg-gray-500 text-white">
                        Out of Stock
                      </Badge>
                    )}
                    <Button size="icon" variant="ghost" className="absolute top-3 right-3 bg-white/80 hover:bg-white">
                      <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{product.title}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">{product.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          product.priceChange === "down" ? "text-green-600" : 
                          product.priceChange === "up" ? "text-red-600" : "text-foreground"
                        }`}>
                          {product.price}
                        </span>
                        {product.priceChange === "down" && (
                          <span className="text-sm text-muted-foreground line-through">{product.originalPrice}</span>
                        )}
                        {product.savings && (
                          <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                            Save {product.savings}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">Saved {product.savedDate}</div>
                    {product.inStock ? (
                      <Button className="w-full" size="sm">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    ) : (
                      <div>
                        <Button className="w-full mb-2" size="sm" variant="outline" disabled>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Out of Stock
                        </Button>
                        <div className="text-xs text-center text-muted-foreground">
                          Restocking {product.restockDate}
                        </div>
                      </div>
                    )}
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {savedServices.map((service) => (
                <Card key={service.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="relative">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <Button size="icon" variant="ghost" className="absolute top-3 right-3 bg-white/80 hover:bg-white">
                      <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{service.title}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">{service.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{service.provider}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">{service.nextAvailable}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">Saved {service.savedDate}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">{service.price}</span>
                      <Button size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Now
                      </Button>
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