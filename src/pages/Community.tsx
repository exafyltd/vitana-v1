import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { CommunityFiltersPopup } from "@/components/CommunityFiltersPopup";
import { Heart, Users, MapPin, Radio, Trophy, TrendingUp, Calendar, Crown, Award, Target, Globe, Filter, Plane, Search, Plus, Star, Play, Music } from "lucide-react";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";

import StandardHeader from "@/components/StandardHeader";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

export default withScreenId(function Community() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [timeframe, setTimeframe] = useState("7d");
  const [scope, setScope] = useState("global");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [communityFiltersOpen, setCommunityFiltersOpen] = useState(false);
  
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

          {/* Action Buttons */}
          <UtilityActionButton>
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button size="sm" onClick={() => setCommunityFiltersOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Hub
            </Button>
          </UtilityActionButton>

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

          <SplitBar defaultValue="overview" className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="overview">Overview</SplitBarTrigger>
              <SplitBarTrigger value="rankings">Rankings</SplitBarTrigger>
              <SplitBarTrigger value="spotlight">Spotlight</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="overview">
              {/* Row 1 - Today Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-orange-200 via-amber-200 to-yellow-200 relative flex items-end">
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">7:00 AM</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">Morning Run Club 🏃‍♀️</h3>
                      <p className="text-white/90 text-sm">City Park • Sunrise energy</p>
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-purple-200 via-indigo-200 to-blue-200 relative flex items-end">
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">🎧 PODCAST</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">Mindful Break</h3>
                      <p className="text-white/90 text-sm">"Breathing for Focus"</p>
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-cyan-200 via-teal-200 to-emerald-200 relative flex items-end">
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">💪 CHALLENGE</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">Hydration Streak</h3>
                      <p className="text-white/90 text-sm">85 participants strong!</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Motivational Banner Strip */}
              <div className="mb-6 p-6 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-xl text-center">
                <h2 className="text-xl font-bold text-white mb-2">Jovana, your community streak is inspiring 💥</h2>
                <p className="text-white/90">Keep connecting and growing with your wellness tribe!</p>
              </div>

              {/* Row 2 - This Week in Community */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-pink-200 via-rose-200 to-red-200 relative flex items-end">
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">Friday 8 PM</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">Longevity Dance Night 💃</h3>
                      <p className="text-white/90 text-sm">Colorful lights & energy</p>
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-green-200 via-lime-200 to-emerald-200 relative flex items-end">
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">🍎 WORKSHOP</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">Nutrition Workshop</h3>
                      <p className="text-white/90 text-sm">Sunday 11 AM • Fresh prep</p>
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-indigo-200 via-purple-200 to-violet-200 relative flex items-end">
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">✨ AI SPOTLIGHT</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">Sleep & Recovery Circle</h3>
                      <p className="text-white/90 text-sm">Cozy evening vibes</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Row 3 - Discover People */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="h-32 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl">👩‍💻</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1">Jovana T.</h3>
                      <p className="text-muted-foreground text-sm mb-2">12 mutual groups</p>
                      <Button size="sm" variant="outline" className="w-full">Connect</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="h-32 bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl">🩺</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1">Dr. Roberts</h3>
                      <p className="text-muted-foreground text-sm mb-2">Hydration Challenge Host</p>
                      <Button size="sm" variant="outline" className="w-full">Follow</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="h-32 bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl">🌸</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1">Mariia</h3>
                      <p className="text-muted-foreground text-sm mb-2">Wellness Influencer & Ambassador</p>
                      <Button size="sm" variant="outline" className="w-full">Connect</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 4 - Community Media */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-amber-200 via-orange-200 to-red-200 relative flex items-end">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-16 h-16 text-white/50" />
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">🎥 REPLAY</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">Evening Yoga Flow</h3>
                      <p className="text-white/90 text-sm">Sunset relaxation session</p>
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-teal-200 via-cyan-200 to-blue-200 relative flex items-end">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Radio className="w-16 h-16 text-white/50" />
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">🎬 SHORTS</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">3 Easy Morning Stretches</h3>
                      <p className="text-white/90 text-sm">Balcony wellness routine</p>
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-violet-200 via-purple-200 to-indigo-200 relative flex items-end">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music className="w-16 h-16 text-white/50" />
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/90 text-black">🎵 PLAYLIST</Badge>
                      <h3 className="font-bold text-white text-lg mb-1">Focus Beats for Study</h3>
                      <p className="text-white/90 text-sm">Headphones & laptop vibes</p>
                    </div>
                  </div>
                </Card>
              </div>
            </SplitBarContent>

            <SplitBarContent value="rankings">
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

              {/* Top 3 Groups - Big Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="overflow-hidden border-2 border-yellow-200">
                  <div className="h-40 bg-gradient-to-br from-yellow-100 to-amber-100 relative flex items-center justify-center">
                    <div className="text-4xl">🥇</div>
                    <Badge className="absolute top-4 right-4 bg-yellow-500 text-white">1,240 members</Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2">Sleep & Recovery Circle</h3>
                    <p className="text-sm text-muted-foreground">Bedtime relaxation community</p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-2 border-gray-200">
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-slate-100 relative flex items-center justify-center">
                    <div className="text-4xl">🥈</div>
                    <Badge className="absolute top-4 right-4 bg-gray-500 text-white">980 members</Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2">Longevity Dance Club</h3>
                    <p className="text-sm text-muted-foreground">Neon dance floor energy</p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-2 border-orange-200">
                  <div className="h-40 bg-gradient-to-br from-orange-100 to-red-100 relative flex items-center justify-center">
                    <div className="text-4xl">🥉</div>
                    <Badge className="absolute top-4 right-4 bg-orange-500 text-white">860 members</Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2">Plant-Based Nutritionists</h3>
                    <p className="text-sm text-muted-foreground">Fresh vegan cuisine</p>
                  </CardContent>
                </Card>
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

              {/* Top Events & Creators */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      Top Events (This Week)
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-50">
                        <div>
                          <h4 className="font-medium">Hydration Challenge</h4>
                          <p className="text-sm text-muted-foreground">Water & ocean theme</p>
                        </div>
                        <Badge>45 participants</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                        <div>
                          <h4 className="font-medium">Mindful Eating Circle</h4>
                          <p className="text-sm text-muted-foreground">Shared food experience</p>
                        </div>
                        <Badge>30 participants</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                        <div>
                          <h4 className="font-medium">Evening Sleep Workshop</h4>
                          <p className="text-sm text-muted-foreground">Cozy dark room vibes</p>
                        </div>
                        <Badge>25 participants</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Top Creators
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">🧘‍♀️</div>
                          <div>
                            <h4 className="font-medium">Lisa Chen</h4>
                            <p className="text-sm text-muted-foreground">Yoga studio master</p>
                          </div>
                        </div>
                        <Badge variant="secondary">12 events</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">💪</div>
                          <div>
                            <h4 className="font-medium">Trainer Mike</h4>
                            <p className="text-sm text-muted-foreground">Fitness bootcamps</p>
                          </div>
                        </div>
                        <Badge variant="secondary">9 events</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">👨‍🍳</div>
                          <div>
                            <h4 className="font-medium">Chef Emma</h4>
                            <p className="text-sm text-muted-foreground">Cooking workshops</p>
                          </div>
                        </div>
                        <Badge variant="secondary">6 events</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gamification Badges */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-500" />
                    Community Badges
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
                      <div className="text-2xl">🔥</div>
                      <div>
                        <h4 className="font-medium">Rising Star</h4>
                        <p className="text-sm text-muted-foreground">Dr. Roberts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                      <div className="text-2xl">⭐</div>
                      <div>
                        <h4 className="font-medium">Top Host</h4>
                        <p className="text-sm text-muted-foreground">Lisa Chen</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <div className="text-2xl">💡</div>
                      <div>
                        <h4 className="font-medium">Most Inspiring</h4>
                        <p className="text-sm text-muted-foreground">Sarah Miller</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="spotlight">
              {/* Featured Group */}
              <Card className="mb-6 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-24 h-24 text-white/30" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <Badge className="mb-3 bg-white/90 text-black">✨ FEATURED GROUP</Badge>
                    <h2 className="text-2xl font-bold text-white mb-2">Sleep & Recovery Circle</h2>
                    <p className="text-white/90">Night-time community for better rest and wellness recovery</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Button className="flex-1">Join Group</Button>
                    <Button variant="outline" className="flex-1">Learn More</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Featured Event */}
              <Card className="mb-6 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-green-300 via-emerald-300 to-teal-300 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calendar className="w-24 h-24 text-white/30" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <Badge className="mb-3 bg-white/90 text-black">🎯 FEATURED EVENT</Badge>
                    <h2 className="text-2xl font-bold text-white mb-2">Mindful Eating Circle</h2>
                    <p className="text-white/90">Colorful shared meal table experience with the community</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Button className="flex-1">RSVP Now</Button>
                    <Button variant="outline" className="flex-1">Add to Calendar</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Featured Creator */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-3xl shadow-lg">
                      🧘‍♀️
                    </div>
                    <div className="flex-1">
                      <Badge className="mb-2">⭐ FEATURED CREATOR</Badge>
                      <h2 className="text-2xl font-bold mb-2">Lisa Chen — Longevity Ambassador</h2>
                      <p className="text-muted-foreground mb-4">Yoga studio portrait expert helping thousands find balance and wellness</p>
                      <div className="flex gap-3">
                        <Button size="sm">Follow</Button>
                        <Button variant="outline" size="sm">View Profile</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Spotlight Suggestion */}
              <Card className="mb-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">
                      🤖
                    </div>
                    <div className="flex-1">
                      <Badge className="mb-2 bg-cyan-500 text-white">🧠 AI SPOTLIGHT</Badge>
                      <h3 className="text-lg font-bold mb-2">Based on your wellness goals, join this Hydration Challenge 💧</h3>
                      <p className="text-muted-foreground mb-4">Refreshing water theme challenge perfectly matched to your current health journey</p>
                      <Button>Join Challenge</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Motivational Banner Strip */}
              <div className="p-6 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-xl text-center">
                <h2 className="text-xl font-bold text-white mb-2">Jovana, you inspire others by joining meetups 💡</h2>
                <p className="text-white/90">Your active community participation lights the way for others!</p>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />

      {/* Community Filters Popup */}
      <CommunityFiltersPopup 
        open={communityFiltersOpen} 
        onOpenChange={setCommunityFiltersOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_OVERVIEW);