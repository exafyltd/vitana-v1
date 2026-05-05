import { useState } from "react";
import { Send, Clock, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminUsersNavigation } from "@/config/navigation";
import { useSignupInvitations } from "@/hooks/useSignupFunnel";
import { t } from '@/lib/i18n-toast';

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "sent", label: "Sent" },
  { value: "opened", label: "Opened" },
  { value: "clicked", label: "Clicked" },
  { value: "converted", label: "Converted" },
  { value: "expired", label: "Expired" },
];

const STATUS_VARIANT_MAP: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
  sent: "default",
  opened: "secondary",
  clicked: "secondary",
  converted: "success",
  expired: "destructive",
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function Invitations() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = useSignupInvitations({
    status: statusFilter === "all" ? "" : statusFilter,
    page: page + 1,
    pageSize,
  });

  const invitations = data?.invitations ?? [];
  const total = data?.total ?? 0;

  // Derive quick stats from current data
  const pendingCount = invitations.filter(
    (inv) => inv.status === "sent" || inv.status === "opened" || inv.status === "clicked"
  ).length;
  const convertedCount = invitations.filter((inv) => inv.status === "converted").length;

  const columns = [
    {
      key: "email",
      label: "Email",
      sortable: true,
    },
    {
      key: "role",
      label: "Type",
      render: (value: string | null) => (
        <Badge variant="outline" className="capitalize">
          {value || "default"}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge
          variant={STATUS_VARIANT_MAP[value?.toLowerCase()] || "secondary"}
          className="capitalize"
        >
          {value || "unknown"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      label: "Sent Date",
      sortable: true,
      render: (value: string) => (
        <span className="text-muted-foreground">{formatDate(value)}</span>
      ),
    },
    {
      key: "expires_at",
      label: "Expires",
      sortable: true,
      render: (value: string | null) => (
        <span className="text-muted-foreground">{value ? formatDate(value) : "Never"}</span>
      ),
    },
  ];

  return (
    <AppLayout>
      <SubNavigation items={adminUsersNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.invitations')}
            description="Manage onboarding invitations sent to users who need help completing signup."
            emoji="📬"
          />

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminStatsCard
              title={t('screens.admin.totalSent')}
              value={total}
              icon={Send}
              loading={isLoading}
            />
            <AdminStatsCard
              title={t('screens.admin.pending')}
              value={pendingCount}
              subtitle="Sent, opened, or clicked"
              icon={Clock}
              loading={isLoading}
              variant="warning"
            />
            <AdminStatsCard
              title={t('screens.admin.converted')}
              value={convertedCount}
              subtitle="Successfully onboarded"
              icon={UserCheck}
              loading={isLoading}
              variant="success"
            />
          </div>

          {/* Invitations Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('screens.admin.invitationLog')}</CardTitle>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('screens.admin.filterByStatus2')} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <AdminTable
                data={invitations}
                columns={columns}
                loading={isLoading}
                emptyMessage="No invitations found"
                paginated
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
