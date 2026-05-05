import { useState } from "react";
import { Bell, Send, Eye, Clock } from "lucide-react";
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
import { adminNotificationsNavigation } from "@/config/navigation";
import { useSentNotifications } from "@/hooks/useAdminNotifications";
import { t } from '@/lib/i18n-toast';

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "welcome_to_vitana", label: "Welcome" },
  { value: "new_recommendation", label: "Recommendation" },
  { value: "meetup_recommended", label: "Meetup" },
  { value: "live_room_starting", label: "Live Room" },
  { value: "morning_briefing_ready", label: "Briefing" },
  { value: "daily_diary_reminder", label: "Diary" },
  { value: "new_chat_message", label: "Chat" },
];

const DAYS_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const columns = [
  {
    key: "type",
    label: "Type",
    render: (val: string) => (
      <Badge variant="outline" className="font-mono text-xs">
        {val?.replace(/_/g, " ") || "unknown"}
      </Badge>
    ),
  },
  {
    key: "title",
    label: "Title",
    sortable: true,
  },
  {
    key: "body",
    label: "Body",
    render: (val: string) => (
      <span className="text-sm text-muted-foreground line-clamp-1 max-w-[300px]">
        {val || "-"}
      </span>
    ),
  },
  {
    key: "channel",
    label: "Channel",
    render: (val: string) => (
      <Badge variant="secondary" className="text-xs">
        {val || "push_and_inapp"}
      </Badge>
    ),
  },
  {
    key: "priority",
    label: "Priority",
    render: (val: string) => {
      const variant = val === "p0" ? "destructive" : val === "p1" ? "default" : "secondary";
      return <Badge variant={variant as any} className="text-xs">{val || "p2"}</Badge>;
    },
  },
  {
    key: "read_at",
    label: "Read",
    render: (val: string | null) =>
      val ? (
        <Badge variant="outline" className="text-xs text-green-600">Read</Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-muted-foreground">Unread</Badge>
      ),
  },
  {
    key: "created_at",
    label: "Sent",
    sortable: true,
    render: (val: string) => {
      if (!val) return "-";
      const d = new Date(val);
      return (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      );
    },
  },
];

export default function SentLog() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useSentNotifications({
    type: typeFilter === "all" ? undefined : typeFilter,
    days,
    page,
    pageSize,
  });

  const notifications = data?.data || [];
  const total = data?.total || 0;
  const readCount = notifications.filter((n: any) => n.read_at).length;

  return (
    <AppLayout>
      <SubNavigation items={adminNotificationsNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader
          title={t('screens.admin.sentNotifications')}
          description="View delivery history and engagement for all notifications"
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard
            title={t('screens.admin.totalSent')}
            value={total}
            subtitle={`Last ${days} days`}
            icon={Send}
            loading={isLoading}
          />
          <AdminStatsCard
            title={t('screens.admin.read')}
            value={readCount}
            subtitle={`of ${notifications.length} on this page`}
            icon={Eye}
            loading={isLoading}
            variant="success"
          />
          <AdminStatsCard
            title={t('screens.admin.unread')}
            value={notifications.length - readCount}
            subtitle="On this page"
            icon={Bell}
            loading={isLoading}
            variant={notifications.length - readCount > 10 ? "warning" : "default"}
          />
          <AdminStatsCard
            title={t('screens.admin.readRate')}
            value={notifications.length ? `${Math.round((readCount / notifications.length) * 100)}%` : "N/A"}
            subtitle="This page"
            icon={Clock}
            loading={isLoading}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('screens.admin.filterByType2')} />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(v) => { setDays(Number(v)); setPage(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <AdminTable
          data={notifications}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search by title or body..."
          emptyMessage="No notifications found for the selected filters"
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
