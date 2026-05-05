import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminUserManagementNavigation } from "@/config/navigation";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
  ResponsiveConfirmDialogTrigger,
} from "@/components/ui/responsive-confirm-dialog";
import { Users, UserPlus, Shield, Trash2, Search, Filter } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface User {
  id: string;
  email: string;
  user_metadata?: any;
  app_metadata?: any;
  created_at: string;
}

interface UserWithMemberships extends User {
  memberships: Array<{
    id: string;
    tenant_id: string;
    role: string;
    status: string;
    tenant: {
      name: string;
      slug: string;
    };
  }>;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

// Note: "reseller" is no longer a role - it's a self-service capability
const ROLE_OPTIONS = [
  { value: "community", label: "Community Member", description: "Basic community access" },
  { value: "patient", label: "Patient", description: "Patient portal access" },
  { value: "professional", label: "Professional", description: "Healthcare professional access" },
  { value: "staff", label: "Staff", description: "Staff portal access" },
  { value: "admin", label: "Admin", description: "Full tenant administration" },
];

type TenantRole = "community" | "patient" | "professional" | "staff" | "admin";

export default function UserManagement() {
  const { session } = useAuth();
  const { isExafyAdmin, activeTenantId, tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningTo, setAssigningTo] = useState<User | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Fetch users with their memberships
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", activeTenantId],
    queryFn: async () => {
      // First get users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select(`
          user_id,
          full_name,
          email,
          created_at
        `);
      
      if (usersError) throw usersError;
      
      // Then get memberships with tenant info
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("memberships")
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          status,
          tenants!inner(
            tenant_id,
            name,
            slug
          )
        `);
        
      if (membershipsError) throw membershipsError;
      
      // Combine the data
      const usersWithMemberships = usersData?.map(user => ({
        id: user.user_id,
        email: user.email || '',
        full_name: user.full_name || '',
        created_at: user.created_at,
        memberships: membershipsData?.filter(m => m.user_id === user.user_id)
          .map(m => ({
            id: m.id,
            tenant_id: m.tenant_id,
            role: m.role,
            status: m.status,
            tenant: {
              name: m.tenants.name,
              slug: m.tenants.slug
            }
          })) || []
      })) || [];
      
      return usersWithMemberships;
    },
    enabled: !!activeTenantId,
  });
  
  // Fetch available tenants
  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: isExafyAdmin,
  });

  const handleAssignRole = async () => {
    if (!assigningTo || !selectedRole) return;
    
    // Determine tenant ID: use selectedTenant for Exafy admins, activeTenantId for others
    const targetTenantId = isExafyAdmin ? selectedTenant : activeTenantId;
    if (!targetTenantId) return;
    
    setIsAssigning(true);
    try {
      // Check if ANY membership exists for this user-tenant pair (due to unique constraint)
      const { data: existingMembership, error: fetchError } = await supabase
        .from("memberships")
        .select("id, role, status")
        .eq("user_id", assigningTo.id)
        .eq("tenant_id", targetTenantId)
        .maybeSingle();
        
      if (fetchError) {
        console.error("Error fetching existing membership:", fetchError);
        throw fetchError;
      }
      
      if (existingMembership) {
        // Update existing membership with new role
        const { error } = await supabase
          .from("memberships")
          .update({ 
            role: selectedRole as TenantRole,
            status: "active" 
          })
          .eq("id", existingMembership.id);
          
        if (error) {
          console.error("Error updating membership:", error);
          throw error;
        }
        
        // Auto-create reseller profile removed - reseller is now self-service capability
      } else {
        // Create new membership
        const { error } = await supabase
          .from("memberships")
          .insert({
            user_id: assigningTo.id,
            tenant_id: targetTenantId,
            role: selectedRole as TenantRole,
            status: "active"
          });
          
        if (error) {
          console.error("Error creating membership:", error);
          throw error;
        }
        
        // Auto-create reseller profile removed - reseller is now self-service capability
      }
      
      notify('toasts.admin.roleAssigned');
      
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setAssignDialogOpen(false);
      setAssigningTo(null);
      setSelectedTenant("");
      setSelectedRole("");
    } catch (error: any) {
      console.error("Role assignment error:", error);
      
      // More specific error messages
      let errorMessage = "Failed to assign role";
      if (error.message?.includes("permission denied") || error.message?.includes("RLS")) {
        errorMessage = "Permission denied. You may not have sufficient privileges to assign this role.";
      } else if (error.message?.includes("unique constraint") || error.message?.includes("duplicate key")) {
        errorMessage = "A membership record already exists. Please try refreshing the page.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notifyError('toasts.admin.error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRevokeRole = async (membershipId: string, userEmail: string, role: string) => {
    try {
      const { error } = await supabase
        .from("memberships")
        .update({ status: "inactive" })
        .eq("id", membershipId);
        
      if (error) throw error;
      
      notify('toasts.admin.roleRevoked');
      
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      notifyError('toasts.admin.error');
    }
  };

  const filteredUsers = users?.filter(user => {
    if (searchEmail && !user.email.toLowerCase().includes(searchEmail.toLowerCase())) {
      return false;
    }
    
    // For non-Exafy admins, only show users within their tenant
    if (!isExafyAdmin) {
      return user.memberships.some(m => m.tenant_id === activeTenantId);
    }
    
    return true;
  }) || [];

  const canAssignRole = (targetRole: string): boolean => {
    if (isExafyAdmin) return true; // Exafy admins can assign any role
    
    // Client admins can assign community, patient, professional, staff roles within their tenant
    const restrictedRoles = ["community", "patient", "professional", "staff"];
    return restrictedRoles.includes(targetRole);
  };

  // Reseller profile creation removed - now handled via self-service in useActivateReseller hook

  // Handle quick role change from inline dropdown
  const handleQuickRoleChange = async (
    membershipId: string, 
    userId: string,
    tenantId: string,
    newRole: TenantRole,
    userEmail: string
  ) => {
    try {
      const { error } = await supabase
        .from("memberships")
        .update({ role: newRole })
        .eq("id", membershipId);

      if (error) throw error;

      // Reseller profile auto-creation removed - now self-service capability

      notify('toasts.admin.roleUpdated');

      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      notifyError('toasts.admin.error');
    }
  };

  if (usersLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.userManagementVitanaAdmin')} 
        description="Manage user roles and permissions across tenants" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminUserManagementNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.userManagement')}
            description={isExafyAdmin 
              ? "Manage user roles and permissions across all tenants" 
              : `Manage user roles within ${tenant?.name}`
            }
            emoji="👥"
          />

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                {t('screens.admin.searchFilterUsers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="search">{t('screens.admin.searchByEmail')}</Label>
                  <Input
                    id="search"
                    placeholder={t('screens.admin.enterEmailAddress')}
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                  />
                </div>
                <ResponsiveDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <ResponsiveDialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('screens.admin.assignRole')}
                    </Button>
                  </ResponsiveDialogTrigger>
                  <ResponsiveDialogContent>
                    <ResponsiveDialogHeader>
                      <ResponsiveDialogTitle>{t('screens.admin.assignRoleUser')}</ResponsiveDialogTitle>
                    </ResponsiveDialogHeader>
                    <ResponsiveDialogBody>
                      <div className="space-y-4">
                        <div>
                          <Label>{t('screens.admin.selectUserByEmail')}</Label>
                          <Select
                            value={assigningTo?.id || ""}
                            onValueChange={(value) => {
                              const user = filteredUsers.find(u => u.id === value);
                              setAssigningTo(user || null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('screens.admin.chooseUser')} />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.email} ({user.full_name || 'No name'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {isExafyAdmin && (
                          <div>
                            <Label>{t('screens.admin.selectTenant')}</Label>
                            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                              <SelectTrigger>
                                <SelectValue placeholder={t('screens.admin.chooseTenant')} />
                              </SelectTrigger>
                              <SelectContent>
                                {tenants?.map((tenant) => (
                                  <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                                    {tenant.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        <div>
                          <Label>{t('screens.admin.selectRole2')}</Label>
                          <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('screens.admin.chooseRole')} />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.filter(role => canAssignRole(role.value)).map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div>
                                    <div className="font-medium">{role.label}</div>
                                    <div className="text-sm text-muted-foreground">{role.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setAssignDialogOpen(false)}
                          >
                            {t('screens.admin.cancel')}
                          </Button>
                          <Button 
                            onClick={handleAssignRole}
                            disabled={!assigningTo || (isExafyAdmin && !selectedTenant) || !selectedRole || isAssigning}
                          >
                            {isAssigning ? "Assigning..." : "Assign Role"}
                          </Button>
                        </div>
                      </div>
                    </ResponsiveDialogBody>
                  </ResponsiveDialogContent>
                </ResponsiveDialog>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold">{user.email}</h3>
                          {user.full_name && (
                            <p className="text-sm text-muted-foreground">{user.full_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{t('screens.admin.joinedValue0', { value0: new Date(user.created_at).toLocaleDateString() })}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {user.memberships.filter(m => m.status === "active").length > 0 ? (
                          user.memberships
                            .filter(m => m.status === "active")
                            .map((membership) => {
                              const canEdit = isExafyAdmin || (membership.tenant_id === activeTenantId && membership.role !== "admin");
                              
                              return (
                                <div key={membership.id} className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 bg-secondary/50 rounded-md px-2 py-1">
                                    <Shield className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{membership.tenant.name}:</span>
                                    {canEdit ? (
                                      <Select
                                        value={membership.role}
                                        onValueChange={(value) => 
                                          handleQuickRoleChange(
                                            membership.id, 
                                            user.id, 
                                            membership.tenant_id,
                                            value as TenantRole, 
                                            user.email
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs border-0 bg-transparent p-0 px-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ROLE_OPTIONS.filter(role => canAssignRole(role.value)).map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                              {role.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="text-xs font-medium">{membership.role}</span>
                                    )}
                                  </div>
                                  {canEdit && (
                                    <ResponsiveConfirmDialog>
                                      <ResponsiveConfirmDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </ResponsiveConfirmDialogTrigger>
                                      <ResponsiveConfirmDialogContent>
                                        <ResponsiveConfirmDialogHeader>
                                          <ResponsiveConfirmDialogTitle>{t('screens.admin.revokeRole')}</ResponsiveConfirmDialogTitle>
                                          <ResponsiveConfirmDialogDescription>{t('screens.admin.youSureYouWantRevokeRole', { role: membership.role, email: user.email, name: membership.tenant.name })}
                                          </ResponsiveConfirmDialogDescription>
                                        </ResponsiveConfirmDialogHeader>
                                        <ResponsiveConfirmDialogFooter>
                                          <ResponsiveConfirmDialogCancel>{t('screens.admin.cancel')}</ResponsiveConfirmDialogCancel>
                                          <ResponsiveConfirmDialogAction 
                                            onClick={() => handleRevokeRole(membership.id, user.email, membership.role)}
                                            className="bg-destructive text-destructive-foreground"
                                          >{t('screens.admin.revokeRole')}
                                          </ResponsiveConfirmDialogAction>
                                        </ResponsiveConfirmDialogFooter>
                                      </ResponsiveConfirmDialogContent>
                                    </ResponsiveConfirmDialog>
                                  )}
                                </div>
                              );
                            })
                        ) : (
                          <Badge variant="outline">{t('screens.admin.noActiveRoles')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredUsers.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('screens.admin.noUsersFound2')}</h3>
                  <p className="text-muted-foreground">
                    {searchEmail ? "No users match your search criteria." : "No users available to manage."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}