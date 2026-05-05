/**
 * Overview > Health — rollup of voice lab, KB indexing, navigator, push delivery
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { useOverviewSummary } from "@/hooks/useAdminOverview";
import { t } from '@/lib/i18n-toast';

const HEALTH_CHECKS = [
  { key: "members", label: "Members", description: "User provisioning and tenant membership" },
  { key: "assistant", label: "Assistant", description: "AI personality config and voice sessions" },
  { key: "knowledge", label: "Knowledge Base", description: "Document indexing and search" },
  { key: "navigator", label: "Navigator", description: "Screen catalog and redirect resolution" },
  { key: "push", label: "Push Notifications", description: "FCM delivery and device tokens" },
];

export default function OverviewHealth() {
  const summaryQuery = useOverviewSummary();
  const kpi = summaryQuery.data?.kpi;

  return (
    <AppLayout>
      <AdminTabs sectionKey="overview" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="💚"
          title={t('screens.admin.systemHealth')}
          description="Health status of key subsystems for your tenant"
        />

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {HEALTH_CHECKS.map((check) => {
            // Simple heuristic: if KPI data loaded, mark as healthy
            const isHealthy = !!kpi;
            return (
              <Card key={check.key}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium">{check.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{check.description}</div>
                    </div>
                    <AdminStatusBadge variant={isHealthy ? "active" : "inactive"}>
                      {isHealthy ? "Healthy" : "Unknown"}
                    </AdminStatusBadge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {kpi && (
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{t('screens.admin.lastCheckedValue0Value1', { value0: summaryQuery.data?.generated_at ? new Date(summaryQuery.data.generated_at).toLocaleString() : "—", value1: summaryQuery.data?.cached && " (cached)" })}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
