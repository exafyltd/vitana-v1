import { useState } from "react";
import { Shield, AlertTriangle, Lock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminAuditNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

const columns = [
  {
    key: "kind",
    label: "Event",
    sortable: true,
    render: (val: string) => <span className="font-mono text-xs">{val || "-"}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (val: string) => {
      const variant = val === "error" ? "destructive" : val === "warning" ? "outline" : "secondary";
      return <Badge variant={variant as any}>{val || "info"}</Badge>;
    },
  },
  {
    key: "source",
    label: "Source",
    render: (val: string) => <Badge variant="outline">{val || "system"}</Badge>,
  },
  {
    key: "title",
    label: "Title",
    render: (val: string) => <span className="text-sm line-clamp-1 max-w-[250px]">{val || "-"}</span>,
  },
  {
    key: "message",
    label: "Details",
    render: (val: string) => <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{val || "-"}</span>,
  },
  {
    key: "created_at",
    label: "Time",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-",
  },
];

export default function AuditSecurity() {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-security-events", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("oasis_events")
        .select("*", { count: "exact" })
        .or("kind.ilike.%access%,kind.ilike.%bypass%,kind.ilike.%security%,kind.ilike.%dev.access%,kind.ilike.%forbidden%,kind.ilike.%unauthorized%")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });

  const events = data?.data || [];
  const total = data?.total || 0;
  const errorCount = events.filter((e: any) => e.status === "error").length;
  const bypassCount = events.filter((e: any) => e.kind?.includes("bypass")).length;

  return (
    <AppLayout>
      <SubNavigation items={adminAuditNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.securityAudit')} description="Dev access grants, bypass attempts, and security-related events" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.securityEvents')} value={total} icon={Shield} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.errors')} value={errorCount} icon={AlertTriangle} loading={isLoading} variant={errorCount > 0 ? "error" : "default"} />
          <AdminStatsCard title={t('screens.admin.bypassAttempts')} value={bypassCount} icon={Lock} loading={isLoading} variant={bypassCount > 0 ? "warning" : "default"} />
          <AdminStatsCard title={t('screens.admin.page')} value={events.length} icon={Eye} loading={isLoading} />
        </div>

        <AdminTable
          data={events}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search security events..."
          emptyMessage="No security events found"
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
