import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save } from "lucide-react";
import { adminTenantManagementNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function TenantConfig() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.adminTenantConfiguration')} 
        description="Configure tenant-specific settings" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminTenantManagementNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.tenantConfiguration')}
            description="Configure settings for Maxina, Alkalma, and Earthlinks organizations"
            emoji="⚙️"
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t('screens.admin.tenantSettings')}
              </CardTitle>
              <Button>
                <Save className="w-4 h-4 mr-2" />
                {t('screens.admin.saveChanges')}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('screens.admin.configureTenantspecificFeaturesBrandingPermissions')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
