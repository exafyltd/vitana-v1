import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Search, Clock, Settings, Heart, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "context", name: "Context", path: "/dashboard/context" },
  { id: "actions", name: "Actions", path: "/dashboard/actions" },
  { id: "matches", name: "Matches", path: "/dashboard/matches" },
  { id: "aifeed", name: "AI Feed", path: "/dashboard/aifeed" },
];

export default function Context() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO title="Context | Dashboard" description="Now & Context Snapshot" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <h1 className="text-3xl font-bold text-foreground mb-2">Now & Context Snapshot 🌍</h1>
              <p className="text-muted-foreground">Transparency: Why Autopilot makes these choices.</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* My Current Vibe */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <Switch />
                </div>
                <CardTitle className="text-lg">My Current Vibe 🌍</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Location: Downtown | Mood: 😊 Energetic<br/>
                  Sleep Score: 85/100 | Stress: Low
                </CardDescription>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">Edit Mood</Button>
                  <Button variant="outline" size="sm" className="w-full">Update</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <Switch className="inline w-4 h-4 mr-1" /> Let AI Handle
                </p>
              </CardContent>
            </Card>

            {/* Why It Matters */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 text-green-600" />
                  </div>
                  <Switch />
                </div>
                <CardTitle className="text-lg">Why It Matters 🔍</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  "Because you slept late, I softened your workout and added a recovery session."
                </CardDescription>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">Cool</Button>
                  <Button variant="outline" size="sm" className="w-full">No Thanks</Button>
                  <Button variant="outline" size="sm" className="w-full">Change Rule</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <Switch className="inline w-4 h-4 mr-1" /> Let AI Handle
                </p>
              </CardContent>
            </Card>

            {/* Next 12 Hours */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <Switch />
                </div>
                <CardTitle className="text-lg">Next 12 Hours ⏳</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Energy peaks: 10am, 3pm<br/>
                  Focus times: 9-11am, 2-4pm<br/>
                  Rest windows: 12-1pm, 6-7pm
                </CardDescription>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">Use This Plan</Button>
                  <Button variant="outline" size="sm" className="w-full">Remind Me</Button>
                  <Button variant="outline" size="sm" className="w-full">Share With Friend</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <Switch className="inline w-4 h-4 mr-1" /> Let AI Handle
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}