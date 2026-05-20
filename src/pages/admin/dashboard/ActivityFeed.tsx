import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminTable } from "@/components/admin/AdminTable";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminDashboardNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
const PAGE_SIZE = 20;

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  info: "secondary",
  success: "default",
  warning: "outline",
  error: "destructive",
};

export default function ActivityFeed() {
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  // Count query for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["admin-oasis-events-count", typeFilter, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("oasis_events")
        .select("*", { count: "exact", head: true });

      if (typeFilter.trim()) {
        query = query.ilike("type", `%${typeFilter.trim()}%`);
      }
      if (sourceFilter.trim()) {
        query = query.ilike("source", `%${sourceFilter.trim()}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Data query for current page
  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-oasis-events", page, typeFilter, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("oasis_events")
        .select("id, type, topic, source, vtid, service, status, message, created_at")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (typeFilter.trim()) {
        query = query.ilike("type", `%${typeFilter.trim()}%`);
      }
      if (sourceFilter.trim()) {
        query = query.ilike("source", `%${sourceFilter.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const columns = [
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (value: string) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
          {value}
        </code>
      ),
    },
    {
      key: "source",
      label: "Source",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm">{value || "--"}</span>
      ),
    },
    {
      key: "vtid",
      label: "VTID",
      sortable: true,
      render: (value: string) =>
        value ? (
          <span className="font-mono text-xs text-primary">{value}</span>
        ) : (
          <span className="text-muted-foreground">--</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value: string) => {
        const variant = statusVariants[value] ?? "secondary";
        return <Badge variant={variant}>{value || "unknown"}</Badge>;
      },
    },
    {
      key: "message",
      label: "Message",
      render: (value: string) => (
        <span className="text-sm text-muted-foreground max-w-[300px] truncate block" title={value}>
          {value ? (value.length > 80 ? value.slice(0, 80) + "..." : value) : "--"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Time",
      sortable: true,
      render: (value: string) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap" title={value}>
          {formatDistanceToNow(new Date(value), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <SubNavigation items={adminDashboardNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.activityFeed')}
            description="Full OASIS event log"
            emoji="📡"
          />

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="type-filter">{t('screens.admin.eventType')}</Label>
              <Input
                id="type-filter"
                placeholder={t('screens.admin.eGVtidLifecycle')}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-filter">{t('screens.admin.source')}</Label>
              <Input
                id="source-filter"
                placeholder={t('screens.admin.eGGateway')}
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-from">{t('screens.admin.dateFrom')}</Label>
              <Input id="date-from" type="date" disabled placeholder={t('screens.admin.comingSoon2')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-to">{t('screens.admin.date')}</Label>
              <Input id="date-to" type="date" disabled placeholder={t('screens.admin.comingSoon2')} />
            </div>
          </div>

          {/* Events Table */}
          <AdminTable
            data={events ?? []}
            columns={columns}
            loading={isLoading}
            searchable
            searchPlaceholder="Search events..."
            emptyMessage="No OASIS events found"
            paginated
            page={page}
            pageSize={PAGE_SIZE}
            total={totalCount ?? 0}
            onPageChange={setPage}
          />
        </div>
      </div>
    </AppLayout>
  );
}
