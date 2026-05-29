import { useState } from "react";
import { CreditCard, Users, CheckCircle2, AlertCircle } from "lucide-react";
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

import { fmtDate } from '@/lib/locale-format';
const columns = [
  {
    key: "user_id",
    label: "User ID",
    render: (val: string) => <span className="font-mono text-xs">{val?.slice(0, 12)}...</span>,
  },
  {
    key: "display_name",
    label: "Name",
    sortable: true,
    render: (val: string) => <span className="font-medium">{val || "Unknown"}</span>,
  },
  {
    key: "stripe_account_id",
    label: "Stripe Account",
    render: (val: string) => val
      ? <span className="font-mono text-xs">{val}</span>
      : <span className="text-muted-foreground text-xs">{t('screens.admin.notConnected')}</span>,
  },
  {
    key: "stripe_onboarding_complete",
    label: "Onboarding",
    render: (val: boolean) => (
      <Badge variant={val ? "default" : "secondary"}>
        {val ? "Complete" : "Pending"}
      </Badge>
    ),
  },
  {
    key: "created_at",
    label: "Joined",
    sortable: true,
    render: (val: string) => val ? fmtDate(new Date(val)) : "-",
  },
];

export default function SystemCreators() {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-creators", page],
    queryFn: async () => {
      // Try creator_profiles first, fall back to app_users with stripe fields
      const { data, error, count } = await (supabase as any)
        .from("creator_profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    retry: 1,
  });

  if (error) {
    return (
      <AppLayout>
        <SubNavigation items={adminSystemNavigation} />
        <div className="p-6 space-y-6">
          <AdminHeader title={t('screens.admin.creators')} description="Stripe Connect creator accounts" />
          <div className="rounded-xl border bg-card p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('screens.admin.creatorProfiles')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('screens.admin.creatorProfileDataWillAppearHere')}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const creators = data?.data || [];
  const total = data?.total || 0;
  const onboardedCount = creators.filter((c: any) => c.stripe_onboarding_complete).length;

  return (
    <AppLayout>
      <SubNavigation items={adminSystemNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.creators')} description="Stripe Connect creator accounts and onboarding status" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalCreators')} value={total} icon={Users} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.onboarded')} value={onboardedCount} icon={CheckCircle2} loading={isLoading} variant="success" />
          <AdminStatsCard title={t('screens.admin.pending')} value={creators.length - onboardedCount} icon={AlertCircle} loading={isLoading} variant={creators.length - onboardedCount > 0 ? "warning" : "default"} />
          <AdminStatsCard title={t('screens.admin.connected')} value={creators.filter((c: any) => c.stripe_account_id).length} icon={CreditCard} loading={isLoading} />
        </div>

        <AdminTable
          data={creators}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search creators..."
          emptyMessage="No creators registered yet"
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
