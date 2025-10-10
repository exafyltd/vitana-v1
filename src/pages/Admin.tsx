import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { StandardCard } from "@/components/templates/StandardCard";
import { Shield, Users, Settings2 } from "lucide-react";
import { adminDashboardNavigation } from "@/config/navigation";
import AdminHeader from "@/components/admin/AdminHeader";

export default function Admin() {
  return (
    <AppLayout>
      <SEO title="Admin | VITANA" description="VITANA Administration" canonical={window.location.href} />
      <SubNavigation items={adminDashboardNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <AdminHeader
            title="Admin Dashboard"
            description="Manage platform settings and monitor system health."
            emoji="🛡️"
          />

          {/* Content Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="System Status"
                subtitle="Platform Health"
                icon={Shield}
                content={
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-green-600">Online</div>
                    <div className="text-sm text-muted-foreground">All systems operational</div>
                  </div>
                }
              />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="Active Users"
                subtitle="Platform Engagement"
                icon={Users}
                content={
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-blue-600">1,247</div>
                    <div className="text-sm text-muted-foreground">Users active in the last 24h</div>
                  </div>
                }
              />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="Coming Soon"
                subtitle="Admin Features"
                icon={Settings2}
                content={
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• User management</p>
                    <p>• System monitoring</p>
                    <p>• Analytics dashboard</p>
                    <p>• Security settings</p>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}