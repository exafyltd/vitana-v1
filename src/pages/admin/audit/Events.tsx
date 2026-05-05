import { useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminAuditNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  info: "secondary",
  warning: "outline",
  error: "destructive",
};

const columns = [
  {
    key: "kind",
    label: "Kind",
    sortable: true,
    render: (val: string) => <span className="font-mono text-xs">{val || "-"}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (val: string) => <Badge variant={STATUS_VARIANT[val] || "outline"}>{val || "info"}</Badge>,
  },
  {
    key: "source",
    label: "Source",
    render: (val: string) => <Badge variant="outline">{val || "unknown"}</Badge>,
  },
  {
    key: "vtid",
    label: "VTID",
    render: (val: string) => val ? <span className="font-mono text-xs">{val}</span> : "-",
  },
  {
    key: "title",
    label: "Title",
    render: (val: string) => <span className="text-sm line-clamp-1 max-w-[250px]">{val || "-"}</span>,
  },
  {
    key: "message",
    label: "Message",
    render: (val: string) => <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{val || "-"}</span>,
  },
  {
    key: "created_at",
    label: "Time",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-",
  },
];

const STATUS_FILTER = [
  { value: "all", label: "All Statuses" },
  { value: "success", label: "Success" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
];

export default function AuditEvents() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-oasis-events", statusFilter, page],
    queryFn: async () => {
      let query = (supabase as any)
        .from("oasis_events")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });

  const events = data?.data || [];
  const total = data?.total || 0;
  const errorCount = events.filter((e: any) => e.status === "error").length;
  const warningCount = events.filter((e: any) => e.status === "warning").length;

  return (
    <AppLayout>
      <SubNavigation items={adminAuditNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.oasisEvents')} description="System-wide event log for state transitions and decisions" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalEvents')} value={total} icon={Activity} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.errors')} value={errorCount} icon={AlertTriangle} loading={isLoading} variant={errorCount > 0 ? "error" : "default"} />
          <AdminStatsCard title={t('screens.admin.warnings')} value={warningCount} icon={AlertTriangle} loading={isLoading} variant={warningCount > 0 ? "warning" : "default"} />
          <AdminStatsCard title={t('screens.admin.page')} value={events.length} icon={Info} loading={isLoading} />
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AdminTable
          data={events}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search events by kind, source, or VTID..."
          emptyMessage="No events found"
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
