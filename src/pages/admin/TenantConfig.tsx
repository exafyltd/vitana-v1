import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save } from "lucide-react";
import { adminTenantManagementNavigation } from "@/config/navigation";

export default function TenantConfig() {
  return (
    <AppLayout>
      <SEO 
        title="Admin - Tenant Configuration" 
        description="Configure tenant-specific settings" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminTenantManagementNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Tenant Configuration"
            description="Configure settings for Maxina, Alkalma, and Earthlinks organizations"
            emoji="⚙️"
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Tenant Settings
              </CardTitle>
              <Button>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Configure tenant-specific features, branding, and permissions</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
