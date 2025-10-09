import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shield, Activity, TrendingUp, MessageSquare, Building } from "lucide-react";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { AdminTable } from "@/components/admin/AdminTable";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminNavigation } from "@/config/navigation";

export default function AdminDashboard() {
  const { userAnalytics, systemHealth, tenantAnalytics, loading } = useAdminAnalytics();
  const navigate = useNavigate();

  const tenantColumns = [
    {
      key: "tenant_name",
      label: "Workspace",
      sortable: true,
    },
    {
      key: "total_users",
      label: "Total Users",
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value.toLocaleString()}</span>
      ),
    },
    {
      key: "active_users",
      label: "Active Users",
      sortable: true,
      render: (value: number) => (
        <span className="text-green-600 dark:text-green-400 font-medium">
          {value.toLocaleString()}
        </span>
      ),
    },
    {
      key: "admin_count",
      label: "Admins",
      sortable: true,
    },
    {
      key: "staff_count",
      label: "Staff",
      sortable: true,
    },
  ];

  return (
    <AppLayout>
      <SEO 
        title="Admin Dashboard | VITANA" 
        description="Real-time system management and oversight center" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Admin Dashboard"
            description="Real-time system management and oversight center"
            emoji="📊"
          />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatsCard
          title="Total Users"
          value={userAnalytics?.total_users || 0}
          subtitle={`+${userAnalytics?.new_users_7d || 0} new this week`}
          icon={Users}
          loading={loading}
        />

        <AdminStatsCard
          title="Active Users (24h)"
          value={userAnalytics?.active_users_24h || 0}
          subtitle={`${userAnalytics?.active_users_7d || 0} active this week`}
          icon={Activity}
          loading={loading}
          variant="success"
        />

        <AdminStatsCard
          title="Total Workspaces"
          value={systemHealth?.total_tenants || 0}
          subtitle={`${systemHealth?.active_memberships || 0} active memberships`}
          icon={Building}
          loading={loading}
        />

        <AdminStatsCard
          title="Messages Sent"
          value={
            (systemHealth?.total_messages || 0) +
            (systemHealth?.total_global_messages || 0)
          }
          subtitle={`${systemHealth?.total_threads || 0} active threads`}
          icon={MessageSquare}
          loading={loading}
        />
      </div>

      {/* Activity & Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminActivityFeed />

        <Card>
          <CardHeader>
            <CardTitle>Workspace Overview</CardTitle>
            <CardDescription>User distribution across workspaces</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminTable
              data={tenantAnalytics}
              columns={tenantColumns}
              loading={loading}
              searchable
              searchPlaceholder="Search workspaces..."
              emptyMessage="No workspaces found"
            />
          </CardContent>
        </Card>
      </div>

        </div>
      </div>
    </AppLayout>
  );
}