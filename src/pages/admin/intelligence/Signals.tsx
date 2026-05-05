import { useState } from "react";
import { Zap, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminIntelligenceNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

const columns = [
  {
    key: "signal_type",
    label: "Type",
    sortable: true,
    render: (val: string) => <Badge variant="outline">{val?.replace(/_/g, " ") || "unknown"}</Badge>,
  },
  {
    key: "severity",
    label: "Severity",
    render: (val: string) => {
      const variant = val === "critical" ? "destructive" : val === "high" ? "default" : "secondary";
      return <Badge variant={variant as any}>{val || "medium"}</Badge>;
    },
  },
  {
    key: "user_id",
    label: "User",
    render: (val: string) => <span className="font-mono text-xs">{val?.slice(0, 12)}...</span>,
  },
  {
    key: "message",
    label: "Message",
    render: (val: string) => <span className="text-sm line-clamp-1 max-w-[300px]">{val || "-"}</span>,
  },
  {
    key: "confidence",
    label: "Confidence",
    render: (val: number) => val != null ? `${Math.round(val * 100)}%` : "-",
  },
  {
    key: "created_at",
    label: "Detected",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-",
  },
];

export default function IntelligenceSignals() {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-predictive-signals", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("d44_predictive_signals")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    retry: 1,
  });

  const signals = data?.data || [];
  const total = data?.total || 0;

  // If the table doesn't exist yet, show a graceful message
  if (error) {
    return (
      <AppLayout>
        <SubNavigation items={adminIntelligenceNavigation} />
        <div className="p-6 space-y-6">
          <AdminHeader title={t('screens.admin.predictiveSignals')} description="D44 predictive intervention signals" />
          <div className="rounded-xl border bg-card p-8 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('screens.admin.signalsNotActive')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('screens.admin.predictiveSignalsEngineHasNotActivated')}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SubNavigation items={adminIntelligenceNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.predictiveSignals')} description="D44 predictive intervention signals" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalSignals')} value={total} icon={Zap} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.critical')} value={signals.filter((s: any) => s.severity === "critical").length} icon={AlertTriangle} loading={isLoading} variant="error" />
          <AdminStatsCard title={t('screens.admin.high')} value={signals.filter((s: any) => s.severity === "high").length} icon={TrendingUp} loading={isLoading} variant="warning" />
          <AdminStatsCard title={t('screens.admin.page')} value={signals.length} icon={Activity} loading={isLoading} />
        </div>

        <AdminTable
          data={signals}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search signals..."
          emptyMessage="No predictive signals detected"
          paginated
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </AppLayout>
  );
}
