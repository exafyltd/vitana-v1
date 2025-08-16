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

          {/* Dashboard Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>
      </div>
    </AppLayout>
  );
}
