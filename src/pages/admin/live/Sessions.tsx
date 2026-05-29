import { useState } from "react";
import { CalendarDays, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminLiveNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  live: "default",
  lobby: "secondary",
  scheduled: "outline",
  ended: "secondary",
  cancelled: "destructive",
};

const columns = [
  {
    key: "session_title",
    label: "Title",
    sortable: true,
    render: (val: string) => <span className="font-medium">{val || "Untitled"}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (val: string) => (
      <Badge variant={STATUS_VARIANT[val] || "outline"}>{val}</Badge>
    ),
  },
  {
    key: "starts_at",
    label: "Starts At",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-",
  },
  {
    key: "ends_at",
    label: "Ends At",
    render: (val: string) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-",
  },
  {
    key: "max_participants",
    label: "Max",
    render: (val: number) => val || 100,
  },
  {
    key: "access_level",
    label: "Access",
    render: (val: string) => <Badge variant="outline">{val || "public"}</Badge>,
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    render: (val: string) => val ? fmtDate(new Date(val)) : "-",
  },
];

export default function LiveSessions() {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-live-sessions", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("live_room_sessions")
        .select("*", { count: "exact" })
        .order("starts_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });

  const sessions = data?.data || [];
  const total = data?.total || 0;
  const liveCount = sessions.filter((s: any) => s.status === "live").length;
  const endedCount = sessions.filter((s: any) => s.status === "ended").length;

  return (
    <AppLayout>
      <SubNavigation items={adminLiveNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.sessions')} description="History of all live room sessions" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalSessions')} value={total} icon={CalendarDays} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.liveNow')} value={liveCount} icon={PlayCircle} loading={isLoading} variant="success" />
          <AdminStatsCard title={t('screens.admin.ended')} value={endedCount} icon={CheckCircle2} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.thisPage')} value={sessions.length} icon={XCircle} loading={isLoading} />
        </div>

        <AdminTable
          data={sessions}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search sessions..."
          emptyMessage="No sessions found"
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
