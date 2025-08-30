import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Building2, UserPlus, Settings, Shield, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantProvider";
import { useSession } from "@/contexts/SessionProvider";
import SEO from "@/components/SEO";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_name: string;
  status: string;
}

interface Workspace {
  id: string;
  name: string;
  member_count: number;
}

const AdminDashboard = () => {
  const { isExafyAdmin, tenant } = useTenant();
  const { user } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWorkspace, setInviteWorkspace] = useState("");
  const [inviteRole, setInviteRole] = useState("community");

  useEffect(() => {
    if (isExafyAdmin) {
      loadData();
    }
  }, [isExafyAdmin]);

  const loadData = async () => {
    try {
      // Load users with their memberships
      const { data: usersData, error: usersError } = await supabase
        .from('memberships')
        .select(`
          user_id,
          role,
          status,
          tenants!inner(id, name),
          profiles!inner(user_id, full_name, email)
        `);

      if (usersError) throw usersError;

      const formattedUsers = usersData?.map((membership: any) => ({
        id: membership.user_id,
        email: membership.profiles.email,
        full_name: membership.profiles.full_name,
        role: membership.role,
        tenant_name: membership.tenants.name,
        status: membership.status
      })) || [];

      setUsers(formattedUsers);

      // Load workspaces with member counts
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          memberships(count)
        `);

      if (workspacesError) throw workspacesError;

      const formattedWorkspaces = workspacesData?.map((workspace: any) => ({
        id: workspace.id,
        name: workspace.name,
        member_count: workspace.memberships?.length || 0
      })) || [];

      setWorkspaces(formattedWorkspaces);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteWorkspace || !inviteRole) return;

    try {
      const { error } = await supabase.functions.invoke('invite_user', {
        body: {
          email: inviteEmail,
          tenant_id: inviteWorkspace,
          role: inviteRole
        }
      });

      if (error) throw error;

      setInviteEmail("");
      setInviteWorkspace("");
      setInviteRole("community");
      loadData(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    }
  };

  const switchToWorkspace = async (workspaceId: string) => {
    try {
      const { error } = await supabase.functions.invoke('set_active_tenant', {
        body: { tenant_id: workspaceId }
      });

      if (error) throw error;
      
      // Refresh the page to update context
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isExafyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <SEO 
        title="Admin Dashboard - VITANA" 
        description="Manage users, workspaces and system settings"
      />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your multi-tenant VITANA system</p>
          {tenant && (
            <Badge variant="outline" className="mt-2">
              Current Workspace: {tenant.name}
            </Badge>
          )}
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="workspaces" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workspaces" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Workspaces
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <Card key={workspace.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {workspace.name}
                      {tenant?.id === workspace.id && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => switchToWorkspace(workspace.id)}
                      variant={tenant?.id === workspace.id ? "secondary" : "default"}
                      className="w-full"
                      disabled={tenant?.id === workspace.id}
                    >
                      {tenant?.id === workspace.id ? "Current Workspace" : "Switch to Workspace"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>System Users</CardTitle>
                <CardDescription>All users across all workspaces</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={`${user.id}-${user.tenant_name}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{user.full_name}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500">{user.tenant_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                        <Badge variant="outline">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invite">
            <Card>
              <CardHeader>
                <CardTitle>Invite New User</CardTitle>
                <CardDescription>Send an invitation to join a workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="workspace">Workspace</Label>
                    <Select value={inviteWorkspace} onValueChange={setInviteWorkspace} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select workspace" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaces.map((workspace) => (
                          <SelectItem key={workspace.id} value={workspace.id}>
                            {workspace.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="community">Community</SelectItem>
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button type="submit" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure system-wide settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Admin Account</h4>
                    <p className="text-sm text-gray-600">Logged in as: {user?.email}</p>
                    <p className="text-sm text-gray-600">Role: Exafy Admin</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">System Status</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">All systems operational</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;