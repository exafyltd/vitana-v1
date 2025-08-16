import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, RotateCcw, Repeat, Lightbulb, CheckCircle, Play, Pause, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "context", name: "Context", path: "/dashboard/context" },
  { id: "actions", name: "Actions", path: "/dashboard/actions" },
  { id: "matches", name: "Matches", path: "/dashboard/matches" },
  { id: "aifeed", name: "AI Feed", path: "/dashboard/aifeed" },
];

export default function AIFeed() {
  return (
    <AppLayout>
      <SEO title="AI Feed | Dashboard" description="AI Feed & Automations" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">AI Feed & Automations ⚡</h1>
            <p className="text-muted-foreground">The magic window – where Autopilot shows its work.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Actions */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-yellow-600 animate-pulse" />
                    </div>
                    <CardTitle className="text-lg">Live Actions 🏃</CardTitle>
                  </div>
                  <Badge variant="outline">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Booked gym session</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Sent reply to Sarah</p>
                      <p className="text-xs text-muted-foreground">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Added sleep reminder</p>
                      <p className="text-xs text-muted-foreground">8 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Optimizing evening routine</p>
                      <p className="text-xs text-muted-foreground">Now</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <RotateCcw className="w-4 h-4 mr-1" />Undo Last
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">Always Okay</Button>
                  <Button variant="outline" size="sm" className="w-full">More Info</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Actions scroll in real time with status updates
                </p>
              </CardContent>
            </Card>

            {/* My Routines */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Repeat className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">My Routines 🔁</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm">💧</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Hydration Reminder</h4>
                        <p className="text-xs text-muted-foreground">Every 2 hours</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm">✅</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Daily Check-in</h4>
                        <p className="text-xs text-muted-foreground">Evening routine</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm">😴</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Sleep Tips</h4>
                        <p className="text-xs text-muted-foreground">Bedtime suggestions</p>
                      </div>
                    </div>
                    <Switch />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Pause className="w-4 h-4 mr-1" />Pause All
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Settings className="w-4 h-4 mr-1" />Edit Routines
                  </Button>
                  <Button variant="default" size="sm" className="w-full">
                    <Play className="w-4 h-4 mr-1" />Run Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Ideas */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">AI Ideas 💡</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                    <h4 className="font-medium mb-2">Morning Routine Optimization</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      "Want me to optimize your morning routine? I noticed you're most energetic at 8 AM."
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="default">Try It</Button>
                      <Button size="sm" variant="outline">Later</Button>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <h4 className="font-medium mb-2">Social Connection Boost</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      "I can schedule weekly friend check-ins based on your calendar gaps."
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="default">Try It</Button>
                      <Button size="sm" variant="outline">Nope</Button>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <h4 className="font-medium mb-2">Stress Pattern Detection</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      "Let me track patterns and suggest breaks before you feel overwhelmed."
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="default">Try It</Button>
                      <Button size="sm" variant="outline">Later</Button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    <Lightbulb className="inline w-4 h-4 mr-1 text-purple-600" />
                    Suggestions based on your patterns and goals
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Autopilot Status Bar */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-600 animate-pulse" />
                    <span className="font-medium">Autopilot Status:</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Central feed of everything AI does • Feels alive with real-time updates
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}