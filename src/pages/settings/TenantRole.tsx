import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsNavigation } from "@/config/navigation";
import { Users, Building2, UserCheck, Crown, Briefcase, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useRole } from "@/hooks/useRole";
import { useMemberships } from "@/hooks/useMemberships";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { notify, notifyError, t } from '@/lib/i18n-toast';

export default function TenantRole() {
  const { activeTenantId, tenant, isExafyAdmin, setActiveTenant } = useTenant();
  const { currentRole, setRole, hasPermission, isLoading: roleLoading } = useRole();
  const { memberships, roles, isLoading: membershipsLoading } = useMemberships();
  const { toast } = useToast();
  
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async () => {
    if (!selectedRole || !activeTenantId) return;
    
    setSwitching(true);
    try {
      await setRole(selectedRole as any);
      notify('toasts.settings.roleSwitched');
      setSelectedRole("");
    } catch (error) {
      notifyError('toasts.settings.errorSwitchingRole', 'toasts.settings.failedSwitchRolePleaseTryAgain');
    } finally {
      setSwitching(false);
    }
  };

  const handleTenantSwitch = async () => {
    if (!selectedTenant || !isExafyAdmin) return;
    
    setSwitching(true);
    try {
      await setActiveTenant(selectedTenant);
      notify('toasts.settings.organizationSwitched');
      setSelectedTenant("");
    } catch (error) {
      notifyError('toasts.settings.errorSwitchingOrganization', 'toasts.settings.failedSwitchOrganizationPleaseTryAgain');
    } finally {
      setSwitching(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      community: "Community Member",
      patient: "Patient",
      professional: "Professional",
      staff: "Staff",
      admin: "Administrator"
    };
    return roleMap[role] || role;
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      community: "Access community features and social connections",
      patient: "Full health tracking and medical features",
      professional: "Professional tools for doctors and coaches",
      staff: "Staff management and operational features",
      admin: "Full administrative access and management"
    };
    return descriptions[role] || "Access to role-specific features";
  };

  const getPermissionStatus = (permission: string) => {
    switch (permission) {
      case "Community Access":
        return hasPermission("community") ? "granted" : "denied";
      case "Health Data Access":
        return hasPermission("patient") ? "granted" : "denied";
      case "Professional Tools":
        return hasPermission("professional") ? "granted" : "denied";
      case "Staff Features":
        return hasPermission("staff") ? "granted" : "denied";
      case "Admin Features":
        return hasPermission("admin") ? "granted" : "denied";
      default:
        return "denied";
    }
  };

  const permissions = [
    "Community Access",
    "Health Data Access", 
    "Professional Tools",
    "Staff Features",
    "Admin Features"
  ];

  if (membershipsLoading || roleLoading) {
    return (
      <AppLayout>
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title={t('screens.settings.tenantRoleSwitcherSettings')} description="Switch between roles and tenants" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader 
            title={t('screens.settings.switchRolesTenants')}
            description="Manage your context and permissions"
            emoji="🔄"
          />

          {/* Admin Notice */}
          {isExafyAdmin && (
            <Alert>
              <Crown className="h-4 w-4" />
              <AlertDescription>{t('screens.settings.youExafySuperAdministratorYouCan')}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Current Context */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                {t('screens.settings.currentContext')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">{currentRole ? getRoleDisplayName(currentRole) : "No Role Selected"}</h4>
                    <p className="text-sm text-muted-foreground">{tenant?.name || "No Organization"}</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">{t('screens.settings.active')}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Role Switcher */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                {t('screens.settings.switchRole')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roles && roles.length > 0 ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('screens.settings.availableRoles')}</label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('screens.settings.selectRole')} />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {getRoleDisplayName(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roles.map((role) => (
                      <div 
                        key={role}
                        className={`p-4 border rounded-lg cursor-pointer hover:bg-muted ${
                          currentRole === role ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedRole(role)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            currentRole === role ? 'bg-primary text-primary-foreground' : 'bg-blue-100'
                          }`}>
                            <Users className={`w-4 h-4 ${
                              currentRole === role ? 'text-primary-foreground' : 'text-blue-600'
                            }`} />
                          </div>
                          <h4 className="font-medium">{getRoleDisplayName(role)}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{getRoleDescription(role)}</p>
                        <Badge className={`mt-2 ${
                          currentRole === role 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {currentRole === role ? 'Current' : 'Available'}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleRoleSwitch}
                    disabled={!selectedRole || switching || selectedRole === currentRole}
                  >
                    {switching ? "Switching..." : "Switch Role"}
                  </Button>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('screens.settings.youDonTHaveAnyRole')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Tenant Switcher - Only for Exafy Admins */}
          {isExafyAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t('screens.settings.switchOrganizationAdminOnly')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {memberships && memberships.length > 0 ? (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t('screens.settings.availableOrganizations')}</label>
                      <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('screens.settings.selectOrganization')} />
                        </SelectTrigger>
                        <SelectContent>
                          {memberships.map((membership) => (
                            <SelectItem key={membership.tenant_id} value={membership.tenant_id}>
                              {membership.tenants.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      {memberships.map((membership) => (
                        <div 
                          key={membership.tenant_id}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            activeTenantId === membership.tenant_id ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              activeTenantId === membership.tenant_id ? 'bg-primary' : 'bg-blue-100'
                            }`}>
                              <Building2 className={`w-4 h-4 ${
                                activeTenantId === membership.tenant_id ? 'text-primary-foreground' : 'text-blue-600'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-medium">{membership.tenants.name}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.roleValue0', { value0: getRoleDisplayName(membership.role) })}</p>
                            </div>
                          </div>
                          <Badge className={
                            activeTenantId === membership.tenant_id
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }>
                            {activeTenantId === membership.tenant_id ? 'Active' : 'Available'}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleTenantSwitch}
                      disabled={!selectedTenant || switching || selectedTenant === activeTenantId}
                    >
                      {switching ? "Switching..." : "Switch Organization"}
                    </Button>
                  </>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('screens.settings.noOrganizationMembershipsFound')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Role Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('screens.settings.currentRolePermissions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {permissions.map((permission) => {
                  const status = getPermissionStatus(permission);
                  return (
                    <div key={permission} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">{permission}</span>
                      <div className="flex items-center gap-2">
                        {status === "granted" ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <Badge className="bg-green-100 text-green-700">{t('screens.settings.granted')}</Badge>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <Badge className="bg-gray-100 text-gray-700">{t('screens.settings.notAvailable')}</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}