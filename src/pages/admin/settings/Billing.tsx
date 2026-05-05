/**
 * Settings > Billing — read-only view of tenant billing/plan info
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantSettings } from "@/hooks/useAdminSettings";
import { t } from '@/lib/i18n-toast';

export default function SettingsBilling() {
  const settingsQuery = useTenantSettings();
  const billing = (settingsQuery.data?.billing || {}) as Record<string, unknown>;
  const hasBilling = Object.keys(billing).length > 0;

  return (
    <AppLayout>
      <AdminTabs sectionKey="settings" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="💳"
          title={t('screens.admin.billing')}
          description="View your current plan, usage limits, and billing details"
        />

        {settingsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingBillingInfo')}</p>
        )}

        {settingsQuery.data && !hasBilling && (
          <AdminEmptyState
            title={t('screens.admin.noBillingInformation')}
            description="Billing details have not been configured for this tenant. Contact your administrator to set up a plan."
          />
        )}

        {settingsQuery.data && hasBilling && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{(billing.plan_name as string) || "Unknown"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('screens.admin.usageLimit')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {billing.usage_limit != null ? String(billing.usage_limit) : "Unlimited"}
                </p>
                <p className="text-xs text-muted-foreground">{t('screens.admin.members2')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('screens.admin.currentUsage')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{billing.current_usage != null ? String(billing.current_usage) : "—"}</p>
                <p className="text-xs text-muted-foreground">{t('screens.admin.activeMembers')}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
