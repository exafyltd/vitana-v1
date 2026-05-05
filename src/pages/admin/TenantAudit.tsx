import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Filter } from "lucide-react";
import { adminTenantManagementNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

const mockTenantAuditLogs = [
  { id: 1, tenant: "Maxina", action: "Settings Updated", admin: "Admin User", timestamp: "2025-01-09 11:20 AM", status: "success" },
  { id: 2, tenant: "Alkalma", action: "Role Assignment", admin: "Super Admin", timestamp: "2025-01-09 10:50 AM", status: "success" },
  { id: 3, tenant: "Earthlinks", action: "Feature Enabled", admin: "Admin User", timestamp: "2025-01-09 09:30 AM", status: "success" },
];

export default function TenantAudit() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.adminTenantAuditLogs')} 
        description="Track tenant-level changes and configurations" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminTenantManagementNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.tenantAuditLogs')}
            description="Track tenant configuration changes, feature toggles, and administrative actions"
            emoji="📋"
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('screens.admin.recentTenantChanges')}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  {t('screens.admin.filter')}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  {t('screens.admin.export')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTenantAuditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{log.tenant}</p>
                        <Badge variant="outline">{log.action}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">By: {log.admin}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{log.timestamp}</p>
                      <Badge variant={log.status === "success" ? "default" : "destructive"}>
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
