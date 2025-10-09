import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Server, Database, Zap } from "lucide-react";
import { adminDashboardNavigation } from "@/config/navigation";

export default function SystemHealth() {
  return (
    <AppLayout>
      <SEO 
        title="Admin - System Health" 
        description="Monitor system performance and status" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminDashboardNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="System Health"
            description="Monitor system performance, uptime, and resource usage"
            emoji="🏥"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">99.9%</p>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Server className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">45%</p>
                    <p className="text-sm text-muted-foreground">CPU Usage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">67%</p>
                    <p className="text-sm text-muted-foreground">Storage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">234ms</p>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
