import { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar,
  MapPin,
  Clock,
  Users,
  Star,
  Filter,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Heart
} from "lucide-react";

const calendarSubItems = [
  { id: "overview", name: "Overview", path: "/calendar" },
  { id: "month", name: "Month View", path: "/calendar/month" },
  { id: "week", name: "Week View", path: "/calendar/week" },
  { id: "day", name: "Day View", path: "/calendar/day" },
  { id: "appointments", name: "Appointments", path: "/calendar/appointments" },
  { id: "reminders", name: "Reminders", path: "/calendar/reminders" },
  { id: "motivation", name: "Motivation", path: "/calendar/motivation" },
  { id: "progress", name: "Goal Progress", path: "/calendar/progress" },
  { id: "recommendations", name: "Recommendations", path: "/calendar/recommendations" },
];

const recommendations = [
  {
    id: 1,
    title: "Morning Yoga Flow Session",
    type: "fitness",
    date: "Tomorrow",
    time: "7:00 AM - 8:00 AM",
    location: "Zen Wellness Center",
    distance: "0.8 miles away",
    attendees: 12,
    maxAttendees: 15,
    price: "Free",
    rating: 4.8,
    goalAlignment: "Daily Exercise Routine",
    reason: "Matches your morning preference and flexibility goals",
    hostAvatar: "",
    hostName: "Sarah Johnson",
    tags: ["beginner-friendly", "stress-relief", "flexibility"],
    rsvpStatus: null
  },
  {
    id: 2,
    title: "Healthy Meal Prep Workshop",
    type: "nutrition",
    date: "This Saturday",
    time: "10:00 AM - 1:00 PM",
    location: "Community Kitchen Hub",
    distance: "1.2 miles away",
    attendees: 8,
    maxAttendees: 12,
    price: "$25",
    rating: 4.9,
    goalAlignment: "Healthy Meal Prep",
    reason: "Perfect for learning batch cooking techniques you need",
    hostAvatar: "",
    hostName: "Chef Maria Rodriguez",
    tags: ["hands-on", "meal-prep", "budget-friendly"],
    rsvpStatus: null
  },
  {
    id: 3,
    title: "Mindfulness & Meditation Circle",
    type: "mental health",
    date: "Every Wednesday",
    time: "6:30 PM - 7:30 PM",
    location: "Peaceful Minds Studio",
    distance: "0.5 miles away",
    attendees: 15,
    maxAttendees: 20,
    price: "Donation-based",
    rating: 4.7,
    goalAlignment: "Mindfulness Practice",
    reason: "Regular group practice to deepen your meditation journey",
    hostAvatar: "",
    hostName: "Dr. Michael Chen",
    tags: ["guided", "community", "all-levels"],
    rsvpStatus: null
  },
  {
    id: 4,
    title: "Vitana Community 5K Walk/Run",
    type: "fitness",
    date: "Next Sunday",
    time: "8:00 AM - 10:00 AM",
    location: "Riverside Park",
    distance: "2.1 miles away",
    attendees: 45,
    maxAttendees: 100,
    price: "Free",
    rating: 4.6,
    goalAlignment: "Daily Exercise Routine",
    reason: "Great way to connect with fellow Vitana members while staying active",
    hostAvatar: "",
    hostName: "Vitana Community Team",
    tags: ["all-levels", "networking", "outdoor"],
    rsvpStatus: null
  },
  {
    id: 5,
    title: "Nutrition Q&A with Registered Dietitian",
    type: "nutrition",
    date: "Friday",
    time: "12:00 PM - 1:00 PM",
    location: "Virtual Event",
    distance: "Online",
    attendees: 23,
    maxAttendees: 50,
    price: "Free",
    rating: 4.8,
    goalAlignment: "Healthy Meal Prep",
    reason: "Get expert answers to optimize your nutrition goals",
    hostAvatar: "",
    hostName: "Lisa Thompson, RD",
    tags: ["expert-led", "Q&A", "virtual"],
    rsvpStatus: null
  }
];

const filterOptions = {
  type: ["all", "fitness", "nutrition", "mental health", "social"],
  price: ["all", "free", "paid"],
  time: ["all", "morning", "afternoon", "evening"],
  format: ["all", "in-person", "virtual", "hybrid"]
};

export default function Recommendations() {
  const [filters, setFilters] = useState({
    type: "all",
    price: "all",
    time: "all",
    format: "all"
  });
  const [rsvpStatuses, setRsvpStatuses] = useState<{[key: number]: 'going' | 'interested' | null}>({});

  const handleRSVP = (eventId: number, status: 'going' | 'interested') => {
    setRsvpStatuses(prev => ({
      ...prev,
      [eventId]: prev[eventId] === status ? null : status
    }));
  };

  const getTypeColor = (type: string) => {
    const colors = {
      fitness: "from-blue-100 to-blue-200",
      nutrition: "from-green-100 to-green-200",
      "mental health": "from-purple-100 to-purple-200",
      social: "from-pink-100 to-pink-200"
    };
    return colors[type as keyof typeof colors] || "from-gray-100 to-gray-200";
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      fitness: TrendingUp,
      nutrition: Heart,
      "mental health": Sparkles,
      social: Users
    };
    const Icon = icons[type as keyof typeof icons] || Target;
    return Icon;
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (filters.type !== "all" && rec.type !== filters.type) return false;
    if (filters.price !== "all") {
      if (filters.price === "free" && rec.price !== "Free" && rec.price !== "Donation-based") return false;
      if (filters.price === "paid" && (rec.price === "Free" || rec.price === "Donation-based")) return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <SEO 
        title="Recommendations | Calendar" 
        description="AI-curated events and activities to boost your wellness goals and expand your network" 
        canonical={window.location.href} 
      />
      <SubNavigation items={calendarSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  AI Recommendations 🎯
                </h1>
                <p className="text-muted-foreground">
                  Curated events and activities to boost your goals and expand your wellness network
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Suggest Event
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(filterOptions).map(([filterKey, options]) => (
                <div key={filterKey}>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block capitalize">
                    {filterKey}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {options.map((option) => (
                      <Button
                        key={option}
                        variant={filters[filterKey as keyof typeof filters] === option ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, [filterKey]: option }))}
                        className="capitalize text-xs"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Personalized Insights</h3>
                  <p className="text-muted-foreground mb-3">
                    Based on your goals, schedule, and preferences, we found <strong>{filteredRecommendations.length} perfect matches</strong> for you this week.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">🎯 3 goal-aligned events</Badge>
                    <Badge variant="outline">📍 All within 2 miles</Badge>
                    <Badge variant="outline">⏰ Fits your schedule</Badge>
                    <Badge variant="outline">👥 5 Vitana community events</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRecommendations.map((rec) => {
              const TypeIcon = getTypeIcon(rec.type);
              const rsvpStatus = rsvpStatuses[rec.id];
              
              return (
                <Card 
                  key={rec.id}
                  className={`
                    hover:shadow-lg transition-all duration-300 hover:scale-105 
                    bg-gradient-to-br ${getTypeColor(rec.type)} border border-white/20
                  `}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-white/50 rounded">
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {rec.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {rec.price}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{rec.rating}</span>
                      </div>
                    </div>
                    
                    <CardTitle className="text-lg mb-2">{rec.title}</CardTitle>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={rec.hostAvatar} />
                        <AvatarFallback className="text-xs">
                          {rec.hostName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">by {rec.hostName}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Event Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{rec.date} • {rec.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{rec.location} • {rec.distance}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{rec.attendees}/{rec.maxAttendees} attending</span>
                      </div>
                    </div>

                    {/* Goal Alignment */}
                    <div className="bg-white/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Goal Alignment</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">{rec.goalAlignment}</div>
                      <div className="text-xs text-muted-foreground italic">"{rec.reason}"</div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {rec.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant={rsvpStatus === 'going' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleRSVP(rec.id, 'going')}
                        className="flex-1"
                      >
                        {rsvpStatus === 'going' ? 'Going!' : 'RSVP'}
                      </Button>
                      <Button
                        variant={rsvpStatus === 'interested' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleRSVP(rec.id, 'interested')}
                        className="flex-1"
                      >
                        {rsvpStatus === 'interested' ? 'Interested!' : 'Interested'}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Plus className="w-3 h-3" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Partner Events Section */}
          <Card className="mt-8 bg-white/80 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Partner Events & Wellness Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Discover curated wellness events from our trusted partners in your area.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Local Gyms & Studios</h4>
                  <p className="text-sm text-muted-foreground">Free trial classes and member events</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Nutrition Workshops</h4>
                  <p className="text-sm text-muted-foreground">Cooking classes and meal planning sessions</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Wellness Retreats</h4>
                  <p className="text-sm text-muted-foreground">Day retreats and weekend getaways</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}