import { Settings, ToggleLeft, ShieldCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminSystemNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

const columns = [
  {
    key: "key",
    label: "Control Key",
    sortable: true,
    render: (val: string) => <span className="font-mono text-sm">{val}</span>,
  },
  {
    key: "enabled",
    label: "Status",
    render: (val: boolean) => (
      <Badge variant={val ? "default" : "secondary"}>
        {val ? "Enabled" : "Disabled"}
      </Badge>
    ),
  },
  {
    key: "reason",
    label: "Reason",
    render: (val: string) => <span className="text-sm text-muted-foreground line-clamp-1 max-w-[250px]">{val || "-"}</span>,
  },
  {
    key: "updated_by",
    label: "Updated By",
    render: (val: string) => <span className="text-sm">{val || "-"}</span>,
  },
  {
    key: "expires_at",
    label: "Expires",
    render: (val: string | null) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Never",
  },
  {
    key: "updated_at",
    label: "Last Updated",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-",
  },
];

export default function SystemConfiguration() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-system-controls"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_controls")
        .select("*")
        .order("key");
      if (error) throw error;
      return data || [];
    },
  });

  const controls = data || [];
  const enabledCount = controls.filter((c: any) => c.enabled).length;
  const disabledCount = controls.filter((c: any) => !c.enabled).length;
  const expiringCount = controls.filter((c: any) => c.expires_at).length;

  return (
    <AppLayout>
      <SubNavigation items={adminSystemNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.systemConfiguration')} description="Governance controls and system toggles" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalControls')} value={controls.length} icon={Settings} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.enabled')} value={enabledCount} icon={ToggleLeft} loading={isLoading} variant="success" />
          <AdminStatsCard title={t('screens.admin.disabled')} value={disabledCount} icon={ShieldCheck} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.withExpiry')} value={expiringCount} icon={Clock} loading={isLoading} variant={expiringCount > 0 ? "warning" : "default"} />
        </div>

        <AdminTable
          data={controls}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search controls..."
          emptyMessage="No system controls configured"
        />
      </div>
    </AppLayout>
  );
}
