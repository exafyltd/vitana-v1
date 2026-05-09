import { useState } from "react";
import { UserCog, LogIn, ShieldCheck, Clock } from "lucide-react";
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
      const variant = val === "error" ? "destructive" : val === "success" ? "default" : "secondary";
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

export default function AuditUserActivity() {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-activity", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("oasis_events")
        .select("*", { count: "exact" })
        .or("kind.ilike.%auth%,kind.ilike.%user%,kind.ilike.%role%,kind.ilike.%login%,kind.ilike.%signup%")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });

  const events = data?.data || [];
  const total = data?.total || 0;

  return (
    <AppLayout>
      <SubNavigation items={adminAuditNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.userActivity')} description="Authentication events, role changes, and user-related actions" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalEvents')} value={total} icon={UserCog} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.authEvents')} value={events.filter((e: any) => e.kind?.includes("auth")).length} icon={LogIn} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.roleEvents')} value={events.filter((e: any) => e.kind?.includes("role")).length} icon={ShieldCheck} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.page')} value={events.length} icon={Clock} loading={isLoading} />
        </div>

        <AdminTable
          data={events}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search user activity..."
          emptyMessage="No user activity events found"
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
