import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Users, Shield, AlertCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useMemberships } from "@/hooks/useMemberships";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/context/AuthProvider";
import AdminHeader from "@/components/admin/AdminHeader";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { adminTenantManagementNavigation } from "@/config/navigation";
import { GeminiApiKeySetup } from "@/components/admin/GeminiApiKeySetup";
import { notify, notifyError, t } from '@/lib/i18n-toast';

const TENANT_CONFIGS = {
  maxina: { name: "Maxina", color: "bg-pink-100 text-pink-800" },
  alkalma: { name: "AlKalma", color: "bg-blue-100 text-blue-800" },
  earthlinks: { name: "Earthlinks", color: "bg-green-100 text-green-800" },
};

export default function TenantManagement() {
  const { activeTenantId, tenant, isExafyAdmin, setActiveTenant } = useTenant();
  const { memberships } = useMemberships();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState(activeTenantId || "");
  const [switching, setSwitching] = useState(false);

  const handleTenantSwitch = async () => {
    if (!selectedTenant || selectedTenant === activeTenantId) return;
    
    setSwitching(true);
    try {
      await setActiveTenant(selectedTenant);
      notify('toasts.admin.tenantSwitchedSuccessfully', 'toasts.admin.youNowManagingSelectedOrganization');
    } catch (error) {
      notifyError('toasts.admin.failedSwitchTenant', 'toasts.admin.youDonTHavePermissionAccess');
    } finally {
      setSwitching(false);
    }
  };

  // Show loading while auth is still loading to prevent premature access denied
  if (authLoading) {
    return (
      <AppLayout>
        <SEO title={t('screens.admin.tenantManagementAdmin')} description="Organization and tenant management" canonical={window.location.href} />
        <SubNavigation items={adminTenantManagementNavigation} />
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            <AdminHeader
              title={t('screens.admin.tenantManagement')}
              description="Loading..."
              emoji="🏢"
            />
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">{t('screens.admin.loading')}</div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isExafyAdmin) {
    return (
      <AppLayout>
        <SEO title={t('screens.admin.tenantManagementAdmin')} description="Organization and tenant management" canonical={window.location.href} />
        <SubNavigation items={adminTenantManagementNavigation} />
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            <AdminHeader
              title={t('screens.admin.tenantManagement')}
              description="Organization and tenant management"
              emoji="🏢"
            />
            
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <CardTitle>{t('screens.admin.accessRestricted')}</CardTitle>
                <CardDescription>
                  {t('screens.admin.onlyExafyAdministratorsCanManageTenants')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title={t('screens.admin.tenantManagementAdmin')} description="Switch between organizations and manage tenant access" canonical={window.location.href} />
      <SubNavigation items={adminTenantManagementNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
      <AdminHeader
        title={t('screens.admin.tenantManagement')}
        description="Switch between organizations and manage tenant access"
        emoji="🏢"
      />

      {/* Current Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {t('screens.admin.currentOrganizationContext')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{tenant?.name}</p>
              <p className="text-sm text-muted-foreground">{t('screens.admin.activeTenant')}</p>
            </div>
            <Badge className={TENANT_CONFIGS[tenant?.slug as keyof typeof TENANT_CONFIGS]?.color}>
              {tenant?.slug}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Switcher for Exafy Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('screens.admin.switchOrganization')}
          </CardTitle>
          <CardDescription>
            {t('screens.admin.asExafyAdministratorYouCanSwitch')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('screens.admin.selectOrganization')}</label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder={t('screens.admin.chooseOrganization')} />
                </SelectTrigger>
                <SelectContent>
                  {memberships?.map(membership => (
                    <SelectItem key={membership.tenant_id} value={membership.tenant_id}>
                      {membership.tenants.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleTenantSwitch}
              disabled={switching || selectedTenant === activeTenantId}
              className="w-full"
            >
              {switching ? "Switching..." : "Switch Organization"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Organizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('screens.admin.availableOrganizations')}
          </CardTitle>
          <CardDescription>
            {t('screens.admin.organizationsYouHaveAccessAsExafy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {memberships?.map(membership => (
              <div key={membership.tenant_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{membership.tenants.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Role: {membership.role} • Status: {membership.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={TENANT_CONFIGS[membership.tenants.slug as keyof typeof TENANT_CONFIGS]?.color}>
                    {membership.tenants.slug}
                  </Badge>
                  {membership.tenant_id === activeTenantId && (
                    <Badge variant="outline">Active</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gemini API Configuration */}
      <GeminiApiKeySetup />
        </div>
      </div>
    </AppLayout>
  );
}