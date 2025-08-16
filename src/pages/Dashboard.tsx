import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Brain, CheckSquare, Calendar, Users, Pause, RotateCcw, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";


const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "context", name: "Context", path: "/dashboard/context" },
  { id: "actions", name: "Actions", path: "/dashboard/actions" },
  { id: "matches", name: "Matches", path: "/dashboard/matches" },
  { id: "aifeed", name: "AI Feed", path: "/dashboard/aifeed" },
];


export default function Dashboard() {
  return (
    <AppLayout>
      <SEO title="Dashboard | VITANA" description="VITANA Dashboard" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Hi Jovana, let´s make today a very special day! ✨</h1>
            <p className="text-muted-foreground">Your wellness journey starts with today's opportunities and endless possibilities.</p>
          </div>

          {/* Autopilot Card - Main Feature */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-xl">
                    <Zap className="w-8 h-8 text-yellow-600 animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Autopilot ⚡</CardTitle>
                    <CardDescription>AI is handling your day • 3 done, 2 pending</CardDescription>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm"><Pause className="w-4 h-4 mr-1" />Pause All</Button>
                  <Button variant="outline" size="sm"><RotateCcw className="w-4 h-4 mr-1" />Undo</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-4">
                <Button variant="secondary" size="sm">Off</Button>
                <Button variant="default" size="sm">Assist</Button>
                <Button variant="outline" size="sm">Auto</Button>
              </div>
              <Button className="w-full">Open AI Feed</Button>
            </CardContent>
          </Card>

          {/* Main Dashboard Grid - Vitana Index Prominent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Vitana Index - Prominent Position */}
            <Card 
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300 cursor-pointer group lg:col-span-1"
              onClick={() => window.location.href = '/health-tracker/vitana-index'}
            >
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Vitana Index ⚖️</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  {/* Large Vitana Index Number with Dynamic Glow */}
                  <div className="relative mb-4">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                      <span className="text-4xl font-bold text-green-600">742</span>
                    </div>
                  </div>
                  
                  {/* Subtitle */}
                  <p className="text-base text-muted-foreground mb-3">Your Balance Score</p>
                  
                  {/* Progress Line */}
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-sm text-green-600 font-medium">+11% vs last week</span>
                  </div>
                  
                  {/* Motivational Sentence */}
                  <p className="text-sm text-muted-foreground text-center">Good progress this week ✨</p>
                  
                  {/* Call to Action */}
                  <Button variant="outline" size="sm" className="mt-4 w-full">View Details</Button>
                </div>
              </CardContent>
            </Card>

            {/* How I'm Doing Now */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">How I'm Doing Now 💡</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Mood: 😊 | Energy: ⚡⚡⚡ | Sleep: 💤 | Stress: 📉
                </CardDescription>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">Change Mood</Button>
                  <Button variant="outline" size="sm" className="w-full">Focus Mode</Button>
                </div>
              </CardContent>
            </Card>

            {/* 3 Things To Do Next */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                  <CheckSquare className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">3 Things To Do Next ✅</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Top 3 AI-picked priorities for optimal wellness
                </CardDescription>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">Do It</Button>
                  <Button variant="outline" size="sm" className="w-full">Later</Button>
                  <Button variant="default" size="sm" className="w-full">Let AI Handle</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today's Plan */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Today's Plan 📅</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Timeline blocks: work, fun, friends, rest
                </CardDescription>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">Okay</Button>
                  <Button variant="outline" size="sm" className="w-full">Shift</Button>
                  <Button variant="outline" size="sm" className="w-full"><Plus className="w-4 h-4 mr-1" />Add Break</Button>
                </div>
              </CardContent>
            </Card>

            {/* People to Meet */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-pink-600" />
                </div>
                <CardTitle className="text-lg">People to Meet 🤝</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  3 suggested matches with high compatibility
                </CardDescription>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">Say Hi</Button>
                  <Button variant="outline" size="sm" className="w-full">Meet Up</Button>
                  <Button variant="outline" size="sm" className="w-full">Save</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Goals and Wellness Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Today's Goals */}
            <div className="lg:col-span-2">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Today's Goals</CardTitle>
                    <Button variant="outline" size="sm">View all</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">Morning Hydration</h3>
                        <p className="text-sm text-muted-foreground">Drink 2 glasses of water</p>
                      </div>
                      <div className="text-sm font-medium text-blue-600">8/10</div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-xl">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Zap className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">Cardio Exercise</h3>
                        <p className="text-sm text-muted-foreground">30 minutes running</p>
                      </div>
                      <div className="text-sm font-medium text-green-600">Completed</div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Brain className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">Mindfulness Session</h3>
                        <p className="text-sm text-muted-foreground">15 minutes meditation</p>
                      </div>
                      <div className="text-sm font-medium text-purple-600">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              {/* Upcoming Events */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Yoga Class</p>
                        <p className="text-xs text-muted-foreground">Today, 6:00 PM</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Health Checkup</p>
                        <p className="text-xs text-muted-foreground">Tomorrow, 10:00 AM</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Group Meditation</p>
                        <p className="text-xs text-muted-foreground">Friday, 7:00 AM</p>
                      </div>
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
