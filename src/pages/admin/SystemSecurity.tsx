import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Key, AlertTriangle } from "lucide-react";
import { adminSystemNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function SystemSecurity() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.adminSecuritySettings')} 
        description="Manage system security and access control" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminSystemNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.securitySettings')}
            description="Manage authentication, encryption, and security policies"
            emoji="🔒"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.securityScore')}</p>
                    <p className="text-2xl font-bold">A+</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Lock className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.encryption')}</p>
                    <Badge variant="default">{t('screens.admin.active')}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Key className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.text2faEnabled')}</p>
                    <p className="text-2xl font-bold">95%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.alerts')}</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t('screens.admin.securityPolicies')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{t('screens.admin.passwordPolicy')}</p>
                  <p className="text-sm text-muted-foreground">{t('screens.admin.minimum8CharactersSpecialCharsRequired')}</p>
                </div>
                <Button variant="outline" size="sm">{t('screens.admin.edit')}</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{t('screens.admin.sessionTimeout')}</p>
                  <p className="text-sm text-muted-foreground">{t('screens.admin.autologoutAfter30MinutesInactivity')}</p>
                </div>
                <Button variant="outline" size="sm">{t('screens.admin.edit')}</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{t('screens.admin.apiRateLimiting')}</p>
                  <p className="text-sm text-muted-foreground">{t('screens.admin.text1000RequestsPerHourPerUser')}</p>
                </div>
                <Button variant="outline" size="sm">{t('screens.admin.edit')}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
