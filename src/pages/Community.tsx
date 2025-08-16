import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Users, MapPin, Radio, Trophy, TrendingUp, Calendar } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "Live Interaction", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function Community() {
  const navigate = useNavigate();

  const categoryCards = [
    {
      id: "my-groups",
      title: "My Groups & Feed",
      description: "Personal social feed and group updates",
      icon: Users,
      path: "/community/my-groups",
      color: "from-blue-100 to-cyan-100"
    },
    {
      id: "events",
      title: "Events & Meetups",
      description: "Discover and join local wellness events",
      icon: MapPin,
      path: "/community/events",
      color: "from-green-100 to-teal-100"
    },
    {
      id: "media-hub",
      title: "Media Hub",
      description: "Shorts, podcasts, and community content",
      icon: Radio,
      path: "/community/media-hub",
      color: "from-purple-100 to-violet-100"
    },
    {
      id: "live-interaction",
      title: "Live Interaction",
      description: "Real-time workshops and social sessions",
      icon: Trophy,
      path: "/community/live-interaction",
      color: "from-orange-100 to-amber-100"
    },
    {
      id: "ai-insights",
      title: "AI Insights",
      description: "Personalized recommendations and connections",
      icon: Heart,
      path: "/community/ai-insights",
      color: "from-pink-100 to-rose-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Community" description="Connect with the community through groups, events, and matchmaking" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Let's connect and inspire each other! 🤝</h1>
            <p className="text-muted-foreground">Your personalized community dashboard with live activity and recommendations.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Column - Quick Stats */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Community Stats</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">My Groups</span>
                      <Badge variant="secondary">3</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Upcoming Events</span>
                      <Badge variant="secondary">5</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">New Messages</span>
                      <Badge variant="destructive">12</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Live Sessions</span>
                      <Badge variant="default" className="animate-pulse">2</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">This Week</h3>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium">Most Active</p>
                      <p className="text-muted-foreground">Morning Movers group</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Next Event</p>
                      <p className="text-muted-foreground">Yoga Flow - Tomorrow</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Connections</p>
                      <p className="text-muted-foreground">+3 new matches</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center Columns - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-red-500" />
                    Live Now
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg relative">
                      <Badge variant="destructive" className="absolute top-2 right-2 text-xs animate-pulse">• LIVE</Badge>
                      <h3 className="font-semibold text-sm mb-1">Morning Yoga Flow</h3>
                      <p className="text-xs text-muted-foreground mb-2">with Sarah K. • 45 viewers</p>
                      <Button size="sm" className="w-full">Join Session</Button>
                    </div>
                    <div className="p-4 border rounded-lg relative">
                      <Badge variant="destructive" className="absolute top-2 right-2 text-xs animate-pulse">• LIVE</Badge>
                      <h3 className="font-semibold text-sm mb-1">Q&A with Dr. Wilson</h3>
                      <p className="text-xs text-muted-foreground mb-2">Health Hub • 156 viewers</p>
                      <Button size="sm" className="w-full">Join Session</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Heart className="w-4 h-4 mt-1 text-pink-500" />
                      <div>
                        <p className="text-sm"><span className="font-medium">Alex R.</span> shared a healthy recipe</p>
                        <p className="text-xs text-muted-foreground">Morning Movers • 2h ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="w-4 h-4 mt-1 text-blue-500" />
                      <div>
                        <p className="text-sm">New event: <span className="font-medium">Weekend Hiking Trip</span></p>
                        <p className="text-xs text-muted-foreground">Local Hikers • 4h ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Users className="w-4 h-4 mt-1 text-green-500" />
                      <div>
                        <p className="text-sm"><span className="font-medium">Maria C.</span> joined your group</p>
                        <p className="text-xs text-muted-foreground">Mindful Nutrition • 6h ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Access Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categoryCards.map((card) => (
                  <Card 
                    key={card.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/20"
                    onClick={() => navigate(card.path)}
                  >
                    <CardContent className="p-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                        <card.icon className="w-5 h-5 text-gray-700" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">{card.title}</h3>
                      <p className="text-xs text-muted-foreground">{card.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Column - Recommendations */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Recommended</h3>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Yoga Beginners</h4>
                      <p className="text-xs text-muted-foreground mb-2">95% match • 156 members</p>
                      <Button size="sm" variant="outline" className="w-full">Join Group</Button>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Cooking Workshop</h4>
                      <p className="text-xs text-muted-foreground mb-2">Tomorrow 2 PM • 15 spots left</p>
                      <Button size="sm" variant="outline" className="w-full">Sign Up</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Trending</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-sm">#MorningMotivation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-sm">#HealthyMealPrep</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-sm">#WeekendWorkouts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}