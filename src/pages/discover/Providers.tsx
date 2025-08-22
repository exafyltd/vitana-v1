import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Clock, Users, Verified, Award, TrendingUp } from "lucide-react";

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

export default function Providers() {
  const providers = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      title: "Longevity Medicine Specialist",
      specialty: "Longevity Medicine",
      rating: 4.9,
      reviews: 156,
      location: "New York, NY",
      image: "/public/placeholder.svg",
      badges: ["Top Rated", "Verified"],
      experience: "15 years",
      nextAvailable: "Today 2PM",
      bookings: 1234,
      priceRange: "$150 - $400",
      about: "Board-certified physician specializing in preventive and regenerative medicine for healthy aging."
    },
    {
      id: 2,
      name: "Marcus Rodriguez",
      title: "Functional Fitness Coach",
      specialty: "Fitness & Movement",
      rating: 4.8,
      reviews: 89,
      location: "Los Angeles, CA",
      image: "/public/placeholder.svg",
      badges: ["Trending", "Certified"],
      experience: "8 years",
      nextAvailable: "Tomorrow 9AM",
      bookings: 567,
      priceRange: "$75 - $120",
      about: "Former professional athlete turned longevity fitness specialist focusing on functional movement."
    },
    {
      id: 3,
      name: "Luna Wellness Spa",
      title: "Holistic Wellness Center",
      specialty: "Recovery Therapy",
      rating: 4.9,
      reviews: 234,
      location: "Miami, FL",
      image: "/public/placeholder.svg",
      badges: ["Near You", "Premium"],
      experience: "12 years",
      nextAvailable: "Today 4PM",
      bookings: 2156,
      priceRange: "$90 - $300",
      about: "Full-service wellness center offering massage, recovery treatments, and rejuvenation therapies."
    },
    {
      id: 4,
      name: "Peak Performance Lab",
      title: "Biohacking & Optimization",
      specialty: "Biohacking",
      rating: 4.7,
      reviews: 67,
      location: "Austin, TX",
      image: "/public/placeholder.svg",
      badges: ["New", "Innovative"],
      experience: "5 years",
      nextAvailable: "Friday 10AM",
      bookings: 234,
      priceRange: "$200 - $500",
      about: "Cutting-edge facility specializing in human optimization through advanced biohacking protocols."
    },
    {
      id: 5,
      name: "Maya Wellness Collective",
      title: "Holistic Health Coaching",
      specialty: "Mental Wellness",
      rating: 4.9,
      reviews: 123,
      location: "Seattle, WA",
      image: "/public/placeholder.svg",
      badges: ["Popular", "Holistic"],
      experience: "10 years",
      nextAvailable: "Monday 1PM",
      bookings: 890,
      priceRange: "$85 - $180",
      about: "Integrative approach to wellness combining coaching, nutrition, and mindfulness practices."
    },
    {
      id: 6,
      name: "Dr. Michael Roberts",
      title: "Sleep Optimization Expert",
      specialty: "Sleep Medicine",
      rating: 4.8,
      reviews: 178,
      location: "Chicago, IL",
      image: "/public/placeholder.svg",
      badges: ["Expert", "Verified"],
      experience: "20 years",
      nextAvailable: "Next week",
      bookings: 1567,
      priceRange: "$180 - $350",
      about: "Board-certified sleep specialist helping clients optimize sleep for longevity and performance."
    }
  ];

  return (
    <AppLayout>
      <SEO title="Providers | Discover" description="Find verified wellness providers and longevity specialists" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Find Wellness Providers"
            description="Connect with verified longevity specialists, wellness coaches, and health practitioners."
            icon={Users}
          />

          {/* Filters */}
          <div className="bg-background/95 backdrop-blur-sm rounded-xl p-6 shadow-sm border mb-8">
            <div className="flex flex-wrap gap-3">
              <Select>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Specialties</SelectItem>
                  <SelectItem value="longevity">Longevity Medicine</SelectItem>
                  <SelectItem value="fitness">Fitness & Movement</SelectItem>
                  <SelectItem value="mental">Mental Wellness</SelectItem>
                  <SelectItem value="recovery">Recovery Therapy</SelectItem>
                  <SelectItem value="nutrition">Nutrition</SelectItem>
                  <SelectItem value="sleep">Sleep Medicine</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="local">Near Me</SelectItem>
                  <SelectItem value="travel">Travel Available</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Any Price</SelectItem>
                  <SelectItem value="0-100">$0 - $100</SelectItem>
                  <SelectItem value="100-200">$100 - $200</SelectItem>
                  <SelectItem value="200+">$200+</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Any Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
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
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Provider Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {providers.map((provider) => (
              <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      <img 
                        src={provider.image} 
                        alt={provider.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      {provider.badges.includes("Verified") && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                          <Verified className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{provider.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{provider.rating}</span>
                          <span className="text-sm text-muted-foreground">({provider.reviews})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {provider.badges.map((badge) => (
                      <Badge 
                        key={badge} 
                        variant="secondary" 
                        className={`text-xs ${
                          badge === "Top Rated" ? "bg-green-100 text-green-700" :
                          badge === "Trending" ? "bg-orange-100 text-orange-700" :
                          badge === "New" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {badge === "Trending" && <TrendingUp className="h-3 w-3 mr-1" />}
                        {badge === "Top Rated" && <Award className="h-3 w-3 mr-1" />}
                        {badge}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {provider.about}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Experience:</span>
                      <span className="font-medium">{provider.experience}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price Range:</span>
                      <span className="font-medium">{provider.priceRange}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{provider.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Available {provider.nextAvailable}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">View Profile</Button>
                    <Button size="sm" variant="outline">Book Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}