import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Search, Clock, Settings, Heart, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { dashboardNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";

export default function Context() {
  const navigate = useNavigate();
  const { pendingCount } = useAutopilot();

  return (
    <AppLayout>
      <SEO title="Context | Dashboard" description="Now & Context Snapshot" canonical={window.location.href} />
      <SubNavigation items={dashboardNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Now & Context Snapshot"
            description="Transparency: Why Autopilot makes these choices."
            emoji="🌍"
          />

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
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">Current status shapes AI recommendations</p>
                    {pendingCount > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate("/dashboard/actions")}
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        See {pendingCount} Actions →
                      </Button>
                    )}
                  </div>
                </div>
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
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">Your decisions guide AI priorities</p>
                    {pendingCount > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate("/dashboard/actions")}
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Review Actions →
                      </Button>
                    )}
                  </div>
                </div>
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