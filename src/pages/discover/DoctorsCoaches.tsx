import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { discoverNavigation } from "@/config/navigation";
import { Star, MapPin, Clock, Users, Verified, Award, TrendingUp, Plane, Plus, RefreshCw, Brain, Sparkles } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { DiscoverBookActionPopup } from "@/components/discover/DiscoverBookActionPopup";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Bookmark } from "lucide-react";

export default function DoctorsCoaches() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("find");
  const { getBookmarksByType, removeBookmark, isLoading: bookmarksLoading } = useBookmarks();

  const latestActions = getLatestActions(2);

  const providers = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      title: "Longevity Medicine Specialist",
      specialty: "Longevity Medicine",
      rating: 4.9,
      reviews: 156,
      location: "New York, NY",
      image: "/lovable-uploads/sarah-miller-avatar.jpg",
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
      image: "/lovable-uploads/mike-thompson-avatar.jpg",
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
      image: "/lovable-uploads/design-team-avatar.jpg",
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
      image: "/lovable-uploads/james-davis-avatar.jpg",
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
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
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
      image: "/lovable-uploads/dr-roberts-avatar.jpg",
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
      <SEO title="Doctors & Coaches | Discover" description="Find verified wellness providers and longevity specialists" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Doctors & Coaches"
            description="Connect with verified longevity specialists, wellness coaches, and health practitioners"
            emoji="👨‍⚕️"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search doctors and coaches…"
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

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="find">📂 Find Providers</SplitBarTrigger>
              <SplitBarTrigger value="matches">🏆 Best Matches</SplitBarTrigger>
              <SplitBarTrigger value="myproviders">
                💛 My Providers {getBookmarksByType('provider').length > 0 && `(${getBookmarksByType('provider').length})`}
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="find" className="space-y-6">
              {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 mb-8">
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
              <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full bg-white/80 backdrop-blur-sm border-white/20 relative">
                <BookmarkButton
                  item={{
                    item_type: 'provider',
                    item_id: provider.id.toString(),
                    item_name: provider.name,
                    item_image_url: provider.image,
                    item_metadata: {
                      specialty: provider.specialty,
                      rating: provider.rating,
                      location: provider.location,
                      priceRange: provider.priceRange,
                    },
                  }}
                />
                <CardContent className="p-4 md:p-5 lg:p-6 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="relative">
                      <img 
                        src={provider.image} 
                        alt={provider.name}
                        className="w-12 h-12 md:w-16 md:h-16 lg:w-18 lg:h-18 rounded-full object-cover"
                      />
                      {provider.badges.includes("Verified") && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                          <Verified className="h-2 w-2 md:h-3 md:w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm md:text-base lg:text-lg text-foreground group-hover:text-primary transition-colors">
                        {provider.name}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground">{provider.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs md:text-sm font-medium">{provider.rating}</span>
                          <span className="text-xs md:text-sm text-muted-foreground">({provider.reviews})</span>
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

                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2 flex-1">
                    {provider.about}
                  </p>

                  <div className="space-y-1 md:space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Experience:</span>
                      <span className="font-medium">{provider.experience}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Price Range:</span>
                      <span className="font-medium">{provider.priceRange}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      <span className="text-xs md:text-sm text-muted-foreground">{provider.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                      <span className="text-xs md:text-sm text-green-600">Available {provider.nextAvailable}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" className="flex-1 text-xs md:text-sm h-7 md:h-8 lg:h-9">View Profile</Button>
                    <Button size="sm" variant="default" className="flex-1 text-xs md:text-sm h-7 md:h-8 lg:h-9">Book Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </SplitBarContent>

            <SplitBarContent value="matches" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                    <h2 className="text-2xl font-semibold">AI-Matched Providers</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">Providers matched to your health needs and preferences</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {providers.slice(0, 6).map((provider, index) => (
                      <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="relative">
                              <img 
                                src={provider.image} 
                                alt={provider.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              {provider.badges.includes("Verified") && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                                  <Verified className="h-2 w-2 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-sm">{provider.name}</h3>
                                <div className="bg-white rounded-full px-2 py-1">
                                  <span className="text-xs font-bold text-purple-600">{94 - index * 2}%</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{provider.title}</p>
                            </div>
                          </div>
                          <div className="bg-purple-50 p-2 rounded-lg mb-3">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-purple-500" />
                              <span className="text-xs text-purple-700">Perfect for your health goals</span>
                            </div>
                          </div>
                          <div className="space-y-1 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{provider.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-600">Available {provider.nextAvailable}</span>
                            </div>
                          </div>
                          <Button size="sm" className="w-full text-xs">Book Now</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="myproviders" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-12 text-center">
                  <div className="text-6xl mb-4">💛</div>
                  <h3 className="text-xl font-semibold mb-2">No saved providers yet</h3>
                  <p className="text-muted-foreground">
                    Save your favorite providers and upcoming appointments will appear here
                  </p>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <AutopilotPopup
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
      <DiscoverBookActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
    </AppLayout>
  );
}