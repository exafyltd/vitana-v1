import { useState, useMemo } from "react";
import { Users, UserPlus, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { SplitDetailPanel } from "@/components/admin/SplitDetailPanel";
import { UserDetailPanel } from "@/components/admin/UserDetailPanel";
import { adminUsersNavigation } from "@/config/navigation";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useSendInvitation, useRepairProvisioning } from "@/hooks/useSignupFunnel";
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "community", label: "Community" },
  { value: "patient", label: "Patient" },
  { value: "professional", label: "Professional" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

const ROLE_VARIANT_MAP: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
  admin: "destructive",
  community: "default",
  professional: "secondary",
  patient: "outline",
  staff: "success",
};

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    return fmtDate(new Date(dateStr), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AllUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const pageSize = 20;

  const { users, total, isLoading } = useAdminUsers({
    search,
    role: roleFilter === "all" ? "" : roleFilter,
    page: page + 1, // hook uses 1-indexed pages
    pageSize,
  });

  const sendInvitation = useSendInvitation();
  const repairProvisioning = useRepairProvisioning();

  // Derive stats
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    users.forEach((u: any) => {
      u.user_tenants?.forEach((t: any) => {
        if (t.active_role) roles.add(t.active_role);
      });
    });
    return roles.size;
  }, [users]);

  const columns = [
    {
      key: "display_name",
      label: "User",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {row.avatar_url && (
              <AvatarImage src={row.avatar_url} alt={row.display_name || row.email} />
            )}
            <AvatarFallback className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
              {getInitials(row.display_name, row.email)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.display_name || "No name"}</span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
    },
    {
      key: "active_role",
      label: "Role",
      render: (_: any, row: any) => {
        const role = row.user_tenants?.[0]?.active_role;
        if (!role) return <span className="text-muted-foreground">--</span>;
        return (
          <Badge variant={ROLE_VARIANT_MAP[role.toLowerCase()] || "secondary"} className="capitalize">
            {role}
          </Badge>
        );
      },
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (value: string) => (
        <span className="text-muted-foreground">{formatDate(value)}</span>
      ),
    },
    {
      key: "updated_at",
      label: "Last Active",
      sortable: true,
      render: (value: string) => (
        <span className="text-muted-foreground">{formatDate(value)}</span>
      ),
    },
  ];

  const handleRowClick = (row: any) => {
    setSelectedUser({
      user_id: row.id,
      email: row.email,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      active_role: row.user_tenants?.[0]?.active_role,
      tenant_id: row.user_tenants?.[0]?.tenant_id,
      is_primary: row.user_tenants?.[0]?.status === "active",
      created_at: row.created_at,
      last_sign_in_at: row.updated_at,
      email_confirmed_at: row.created_at, // placeholder
    });
  };

  const detailContent = selectedUser ? (
    <UserDetailPanel
      user={selectedUser}
      onInvite={(userId) => sendInvitation.mutate(userId)}
      onRepair={(userId) => repairProvisioning.mutate(userId)}
    />
  ) : null;

  return (
    <AppLayout>
      <SubNavigation items={adminUsersNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.allUsers')}
            description="Browse, search, and manage all platform users across tenants."
            emoji="👥"
          />

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminStatsCard
              title={t('screens.admin.totalUsers')}
              value={total}
              icon={Users}
              loading={isLoading}
            />
            <AdminStatsCard
              title={t('screens.admin.newToday')}
              value="--"
              subtitle="Placeholder"
              icon={UserPlus}
              loading={isLoading}
            />
            <AdminStatsCard
              title={t('screens.admin.activeRoles')}
              value={uniqueRoles}
              subtitle="Unique roles in current page"
              icon={ShieldCheck}
              loading={isLoading}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t('screens.admin.searchByEmailName')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="max-w-sm"
            />
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('screens.admin.filterByRole')} />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table with Split Detail */}
          <SplitDetailPanel
            detailContent={detailContent}
            onClose={() => setSelectedUser(null)}
            detailTitle="User Details"
          >
            <AdminTable
              data={users}
              columns={columns}
              loading={isLoading}
              onRowClick={handleRowClick}
              emptyMessage="No users found"
              paginated
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </SplitDetailPanel>
        </div>
      </div>
    </AppLayout>
  );
}
