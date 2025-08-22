import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Clock, FileText, CheckCircle, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "context", name: "Context", path: "/dashboard/context" },
  { id: "actions", name: "Actions", path: "/dashboard/actions" },
  { id: "matches", name: "Matches", path: "/dashboard/matches" },
  { id: "aifeed", name: "AI Feed", path: "/dashboard/aifeed" },
];

export default function Actions() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO title="Actions | Dashboard" description="Next Best Actions & Today's Plan" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <h1 className="text-3xl font-bold text-foreground mb-2">Next Best Actions & Today's Plan ⭐</h1>
              <p className="text-muted-foreground">Autopilot = your decision partner.</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top 5 To-Do's */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <CardTitle className="text-lg">Top 5 To-Do's ⭐</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Morning workout</span>
                    <div className="flex space-x-1">
                      <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />✔</Badge>
                      <Button size="sm" variant="outline">Do Now</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Call nutritionist</span>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="default">AI Do It</Button>
                      <Button size="sm" variant="outline">Later</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Plan weekend activities</span>
                    <div className="flex space-x-1">
                      <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />✔</Badge>
                      <Button size="sm" variant="outline">Do Now</Button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button className="w-full">
                    <Zap className="w-4 h-4 mr-2" />
                    Approve All to Autopilot
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Daily Timeline */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Daily Timeline 🕒</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <span className="font-medium">Morning Focus</span>
                      <p className="text-sm text-muted-foreground">9:00 - 11:00 AM</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline">Okay</Button>
                      <Lock className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium">Lunch & Social</span>
                      <p className="text-sm text-muted-foreground">12:00 - 1:30 PM</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline">Move Block</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <span className="font-medium">Evening Wind Down</span>
                      <p className="text-sm text-muted-foreground">8:00 - 10:00 PM</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline">Lock It</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Prep */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Quick Prep 📑</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Short notes for next 3 calls/meetings
              </CardDescription>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Dr. Smith - 2:00 PM</h4>
                  <p className="text-sm text-muted-foreground mb-3">Annual checkup, discuss sleep patterns</p>
                  <div className="space-y-1">
                    <Button size="sm" variant="outline" className="w-full">Read Now</Button>
                    <Button size="sm" variant="outline" className="w-full">Send Agenda</Button>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium mb-2">Yoga Class - 6:00 PM</h4>
                  <p className="text-sm text-muted-foreground mb-3">Beginner session, bring water</p>
                  <div className="space-y-1">
                    <Button size="sm" variant="outline" className="w-full">Read Now</Button>
                    <Button size="sm" variant="outline" className="w-full">Skip</Button>
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium mb-2">Friend Meetup - 7:30 PM</h4>
                  <p className="text-sm text-muted-foreground mb-3">Coffee chat, catch up on life</p>
                  <div className="space-y-1">
                    <Button size="sm" variant="outline" className="w-full">Read Now</Button>
                    <Button size="sm" variant="outline" className="w-full">Send Agenda</Button>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <Zap className="inline w-4 h-4 mr-1 text-yellow-600" />
                  AI can already handle tasks with ✔ if you want to stay hands-off.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}