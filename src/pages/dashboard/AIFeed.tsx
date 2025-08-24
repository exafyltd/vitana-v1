import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, RotateCcw, Repeat, Lightbulb, CheckCircle, Play, Pause, Settings, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";

const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "context", name: "Context", path: "/dashboard/context" },
  { id: "actions", name: "Actions", path: "/dashboard/actions" },
  { id: "matches", name: "Matches", path: "/dashboard/matches" },
  { id: "aifeed", name: "AI Feed", path: "/dashboard/aifeed" },
];

export default function AIFeed() {
  const navigate = useNavigate();
  const { state, executeActions } = useAutopilot();
  
  // Mock activity feed data including completed/failed actions
  const activityFeed = [
    ...state.actions
      .filter(action => action.status !== "pending")
      .map(action => ({
        id: action.id,
        type: "action" as const,
        title: action.title,
        reason: action.reason,
        timestamp: action.timestamp,
        status: action.status,
        icon: action.icon,
        category: action.category
      })),
    {
      id: "routine-1",
      type: "routine" as const,
      title: "Hydration reminder triggered",
      reason: "2 hours since last water intake",
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      status: "completed" as const,
      icon: "💧",
      category: "health" as const
    },
    {
      id: "suggestion-1", 
      type: "suggestion" as const,
      title: "Morning routine optimization suggested",
      reason: "Detected 8 AM energy peak pattern",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "pending" as const,
      icon: "🌅",
      category: "health" as const
    }
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <AppLayout>
      <SEO title="AI Feed | Dashboard" description="AI Feed & Automations" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <h1 className="text-3xl font-bold text-foreground mb-2">AI Feed & Automations ⚡</h1>
              <p className="text-muted-foreground">The magic window – where Autopilot shows its work.</p>
            </div>
            
            {/* Small Index Card - Only Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Updated Activity Feed */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-yellow-600 animate-pulse" />
                    </div>
                    <CardTitle className="text-lg">Activity Feed 🏃</CardTitle>
                  </div>
                  <Badge variant="outline">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {activityFeed.slice(0, 20).map((item) => (
                      <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                        <div className="text-lg">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium">{item.title}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={
                                  item.status === "completed" ? "default" : 
                                  item.status === "failed" ? "destructive" :
                                  item.status === "executing" ? "secondary" :
                                  "outline"
                                }
                                className="text-xs"
                              >
                                {item.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                                {item.status === "failed" && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {item.status === "executing" && <Zap className="w-3 h-3 mr-1" />}
                                {item.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 mr-1 inline" />
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                          {item.status === "failed" && (
                            <div className="mt-2">
                              <Button size="sm" variant="outline">
                                Retry
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4 space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Undo Last Action
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Export Activity Log
                  </Button>
                </div>
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