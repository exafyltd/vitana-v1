import { useState } from "react";
import { Users, Clock, TrendingUp, UserCheck } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminLiveNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

const columns = [
  {
    key: "user_id",
    label: "User ID",
    render: (val: string) => <span className="font-mono text-xs">{val?.slice(0, 12)}...</span>,
  },
  {
    key: "live_room_id",
    label: "Room ID",
    render: (val: string) => <span className="font-mono text-xs">{val?.slice(0, 12)}...</span>,
  },
  {
    key: "joined_at",
    label: "Joined",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-",
  },
  {
    key: "left_at",
    label: "Left",
    render: (val: string) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Still in room",
  },
  {
    key: "duration_minutes",
    label: "Duration (min)",
    sortable: true,
    render: (val: number | null) => val != null ? `${val} min` : "-",
  },
];

export default function LiveAttendance() {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-live-attendance", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("live_room_attendance")
        .select("*", { count: "exact" })
        .order("joined_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });

  const records = data?.data || [];
  const total = data?.total || 0;
  const activeNow = records.filter((r: any) => !r.left_at).length;
  const avgDuration = records.filter((r: any) => r.duration_minutes != null).length > 0
    ? Math.round(records.filter((r: any) => r.duration_minutes != null).reduce((sum: number, r: any) => sum + r.duration_minutes, 0) / records.filter((r: any) => r.duration_minutes != null).length)
    : 0;

  return (
    <AppLayout>
      <SubNavigation items={adminLiveNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.attendance')} description="Track who joined which rooms and for how long" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalRecords')} value={total} icon={Users} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.stillActive')} value={activeNow} icon={UserCheck} loading={isLoading} variant="success" />
          <AdminStatsCard title={t('screens.admin.avgDuration')} value={`${avgDuration} min`} icon={Clock} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.uniqueUsers')} value={new Set(records.map((r: any) => r.user_id)).size} icon={TrendingUp} loading={isLoading} />
        </div>

        <AdminTable
          data={records}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search by user or room ID..."
          emptyMessage="No attendance records found"
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
