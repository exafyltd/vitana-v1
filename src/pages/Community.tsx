import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Users, MapPin, Radio, Trophy, TrendingUp, Calendar, Crown, Award, Target, Globe, Filter, Plane } from "lucide-react";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";

const communitySubItems = [
  { id: "my-groups", name: "My Groups", path: "/community/my-groups" },
  { id: "feed", name: "Feed", path: "/community/feed" },
  { id: "events", name: "Events", path: "/community/events" },
  { id: "live-rooms", name: "Live Rooms", path: "/community/live-rooms" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "business", name: "Business", path: "/community/business" },
  { id: "meetups", name: "Meetups", path: "/community/meetups" },
];

import StandardHeader from "@/components/StandardHeader";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

export default withScreenId(function Community() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [timeframe, setTimeframe] = useState("7d");
  const [scope, setScope] = useState("global");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  // Mock leaderboard data
  const leaderboardData = {
    "Live & Events": [
      { rank: 1, name: "Sarah Miller", score: 2847, avatar: "👩‍💼", isCurrentUser: false },
      { rank: 2, name: "Mike Thompson", score: 2531, avatar: "👨‍💻", isCurrentUser: false },
      { rank: 3, name: "You", score: 2245, avatar: "🧑", isCurrentUser: true },
      { rank: 4, name: "Lisa Chen", score: 2156, avatar: "👩‍🔬", isCurrentUser: false },
      { rank: 5, name: "James Davis", score: 2089, avatar: "👨‍⚕️", isCurrentUser: false }
    ],
    "Social Graph": [
      { rank: 1, name: "Emma Wilson", score: 1856, avatar: "👩‍🎨", isCurrentUser: false },
      { rank: 2, name: "You", score: 1743, avatar: "🧑", isCurrentUser: true },
      { rank: 3, name: "Dr. Roberts", score: 1592, avatar: "👨‍⚕️", isCurrentUser: false },
      { rank: 4, name: "Tae Min", score: 1456, avatar: "🧑‍💼", isCurrentUser: false },
      { rank: 5, name: "Se Hun Oh", score: 1389, avatar: "👨‍💻", isCurrentUser: false }
    ]
  };

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
      id: "live-rooms",
      title: "LIVE Hub",
      description: "Real-time workshops and social sessions",
      icon: Trophy,
      path: "/community/live-rooms",
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
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Your Community Hub"
            description="Connect, share, and grow together with your wellness community."
            emoji="✨"
          />

          {/* Autopilot Integration */}
          <div className="mb-6">
            <AutopilotWidget 
              sectionName="Community"
              suggestions={[
                "Auto-join matching groups based on your interests",
                "Schedule group meetups that fit your calendar",
                "Connect with nearby members for wellness activities"
              ]}
              isEnabled={true}
              variant="inline"
            />
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="overview">Community Overview</TabsTrigger>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
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
            </TabsContent>

            <TabsContent value="rankings">
              {/* Rankings Controls */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Timeframe:</span>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                      <SelectItem value="all">All-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Scope:</span>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="region">Region</SelectItem>
                      <SelectItem value="group">My Groups</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Your Position Band */}
              <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        🧑
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Your Overall Rank</h3>
                        <p className="text-muted-foreground">Based on combined activity across all categories</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">#7</div>
                      <div className="text-sm text-muted-foreground">of 2,347 users</div>
                      <div className="text-xs text-green-600 mt-1">↑ +3 this week</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-white/70 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Boost Your Ranking</span>
                      <Button size="sm" variant="outline">
                        <Target className="w-4 h-4 mr-1" />
                        Boost Me
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-white/50 rounded">• Join 2 more events (+50 pts)</div>
                      <div className="p-2 bg-white/50 rounded">• Share wellness tip (+25 pts)</div>
                      <div className="p-2 bg-white/50 rounded">• Complete weekly goal (+75 pts)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leaderboards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(leaderboardData).map(([category, users]) => (
                  <Card key={category}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        <h3 className="text-lg font-semibold">{category}</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {users.map((user) => (
                          <div 
                            key={user.rank}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              user.isCurrentUser 
                                ? 'bg-primary/10 border-2 border-primary/30' 
                                : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                user.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                user.rank === 2 ? 'bg-gray-100 text-gray-700' :
                                user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{user.avatar}</span>
                                <span className={`font-medium ${user.isCurrentUser ? 'text-primary' : ''}`}>
                                  {user.name}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{user.score.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">points</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t text-center">
                        <Button variant="outline" size="sm">View Full Leaderboard</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Additional Categories */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-semibold">Content Impact</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-yellow-100 text-yellow-700">🥇</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">👩‍🎓</span>
                            <span className="font-medium">Dr. Sarah K.</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">3,245</div>
                          <div className="text-xs text-muted-foreground">impact</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-700">#4</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🧑</span>
                            <span className="font-medium text-primary">You</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">1,856</div>
                          <div className="text-xs text-muted-foreground">impact</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold">Growth Drivers</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-yellow-100 text-yellow-700">🥇</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🧑</span>
                            <span className="font-medium text-primary">You</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">+847</div>
                          <div className="text-xs text-muted-foreground">this week</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-700">🥈</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">👨‍💼</span>
                            <span className="font-medium">Mike J.</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">+723</div>
                          <div className="text-xs text-muted-foreground">this week</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_OVERVIEW);