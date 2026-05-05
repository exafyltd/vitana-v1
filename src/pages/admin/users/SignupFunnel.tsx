import { useState } from "react";
import { Users, CheckCircle, UserCheck, XCircle } from "lucide-react";
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
import { SignupFunnelChart } from "@/components/admin/SignupFunnelChart";
import { adminUsersNavigation } from "@/config/navigation";
import { useSignupFunnel, useSignupAttempts } from "@/hooks/useSignupFunnel";
import { t } from '@/lib/i18n-toast';

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "started", label: "Started" },
  { value: "email_sent", label: "Email Sent" },
  { value: "verified", label: "Verified" },
  { value: "profile_created", label: "Profile Created" },
  { value: "onboarded", label: "Onboarded" },
  { value: "abandoned", label: "Abandoned" },
  { value: "failed", label: "Failed" },
];

const STATUS_VARIANT_MAP: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
  started: "outline",
  email_sent: "secondary",
  verified: "default",
  profile_created: "default",
  onboarded: "success",
  abandoned: "destructive",
  failed: "destructive",
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function SignupFunnel() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: funnelStats, isLoading: funnelLoading } = useSignupFunnel({ days: 30 });
  const { data: attemptsData, isLoading: attemptsLoading } = useSignupAttempts({
    status: statusFilter === "all" ? "" : statusFilter,
    page: page + 1,
    pageSize,
  });

  const attempts = attemptsData?.attempts ?? [];
  const attemptsTotal = attemptsData?.total ?? 0;

  // Build funnel chart data from stats
  const chartData = {
    started: funnelStats?.total_attempts ?? 0,
    email_sent: Math.round((funnelStats?.total_attempts ?? 0) * 0.8),
    verified: Math.round((funnelStats?.completed ?? 0) * 1.2),
    profile_created: funnelStats?.completed ?? 0,
    onboarded: funnelStats?.completed ?? 0,
    abandoned: funnelStats?.failed ?? 0,
  };

  const columns = [
    {
      key: "email",
      label: "Email",
      sortable: true,
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
      label: "Started",
      sortable: true,
      render: (value: string) => (
        <span className="text-muted-foreground text-sm">{formatDate(value)}</span>
      ),
    },
    {
      key: "updated_at",
      label: "Completed",
      sortable: true,
      render: (value: string) => (
        <span className="text-muted-foreground text-sm">{formatDate(value)}</span>
      ),
    },
  ];

  return (
    <AppLayout>
      <SubNavigation items={adminUsersNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.signupFunnel')}
            description="Track user registration flow from initial attempt through onboarding completion."
            emoji="📈"
          />

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatsCard
              title={t('screens.admin.totalAttempts')}
              value={funnelStats?.total_attempts ?? 0}
              icon={Users}
              loading={funnelLoading}
            />
            <AdminStatsCard
              title={t('screens.admin.verified')}
              value={funnelStats?.pending ?? 0}
              subtitle={`${funnelStats?.conversion_rate?.toFixed(1) ?? 0}% conversion rate`}
              icon={CheckCircle}
              loading={funnelLoading}
            />
            <AdminStatsCard
              title={t('screens.admin.onboarded')}
              value={funnelStats?.completed ?? 0}
              icon={UserCheck}
              loading={funnelLoading}
              variant="success"
            />
            <AdminStatsCard
              title={t('screens.admin.abandoned')}
              value={funnelStats?.failed ?? 0}
              icon={XCircle}
              loading={funnelLoading}
              variant="error"
            />
          </div>

          {/* Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t('screens.admin.signupFunnelVisualization')}</CardTitle>
            </CardHeader>
            <CardContent>
              <SignupFunnelChart data={chartData} loading={funnelLoading} />
            </CardContent>
          </Card>

          {/* Attempts Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('screens.admin.signupAttempts')}</CardTitle>
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
                data={attempts}
                columns={columns}
                loading={attemptsLoading}
                emptyMessage="No signup attempts found"
                paginated
                page={page}
                pageSize={pageSize}
                total={attemptsTotal}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
