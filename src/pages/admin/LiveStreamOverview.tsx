import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, TestTube, Users, Calendar, Activity, Plus, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminLiveStreamNavigation } from "@/config/navigation";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";

export default function LiveStreamOverview() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO 
        title="Live & Stream | Admin | VITANA" 
        description="Manage Vertex AI streaming, community live rooms, and telemedicine sessions" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminLiveStreamNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Live & Stream Management"
            description="Manage Vertex AI streaming, community live rooms, and telemedicine sessions"
            emoji="📡"
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatsCard
              title="Active Vertex Sessions"
              value={0}
              subtitle="Connected streams"
              icon={Radio}
            />

            <AdminStatsCard
              title="Live Community Rooms"
              value={0}
              subtitle="Total viewers: 0"
              icon={Users}
              variant="success"
            />

            <AdminStatsCard
              title="Scheduled Sessions"
              value={0}
              subtitle="Next in: --"
              icon={Calendar}
            />

            <AdminStatsCard
              title="Total Stream Time Today"
              value="0h"
              subtitle="vs yesterday: 0h"
              icon={Clock}
            />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20" 
                onClick={() => navigate('/admin/live-stream/vertex-testing')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <TestTube className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Test Vertex AI</CardTitle>
                      <CardDescription className="text-xs">Debug stream</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-xs text-muted-foreground">
                    Test voice streaming with visual feedback and debugging tools
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20" 
                onClick={() => navigate('/admin/live-stream/community-rooms')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Create Room</CardTitle>
                      <CardDescription className="text-xs">Community live</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-xs text-muted-foreground">
                    Start a new community live room for group discussions
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20" 
                onClick={() => navigate('/admin/live-stream/telemedicine')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Schedule Session</CardTitle>
                      <CardDescription className="text-xs">Telemedicine</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-xs text-muted-foreground">
                    Schedule a telemedicine consultation session
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20" 
                onClick={() => navigate('/admin/monitoring/reports')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">View Reports</CardTitle>
                      <CardDescription className="text-xs">Analytics</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-xs text-muted-foreground">
                    View detailed streaming analytics and reports
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest streaming events across all platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>No recent activity</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Vertex AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ready for testing and streaming
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Community Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  0 active rooms, ready for new sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  Telemedicine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon - Infrastructure ready
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
