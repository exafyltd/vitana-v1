import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Filter } from "lucide-react";
import { adminUserManagementNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

const mockUserAuditLogs = [
  { id: 1, user: "John Smith", action: "Login", timestamp: "2025-01-09 10:45 AM", status: "success" },
  { id: 2, user: "Sarah Johnson", action: "Profile Update", timestamp: "2025-01-09 10:30 AM", status: "success" },
  { id: 3, user: "Mike Wilson", action: "Role Change", timestamp: "2025-01-09 10:15 AM", status: "success" },
];

export default function UserAudit() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.adminUserAuditLogs')} 
        description="Track user activities and changes" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminUserManagementNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.userAuditLogs')}
            description="Track user activities, authentication events, and profile changes"
            emoji="📋"
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('screens.admin.recentUserActivity')}
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
                {mockUserAuditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{log.user}</p>
                      <p className="text-sm text-muted-foreground">{log.action}</p>
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
