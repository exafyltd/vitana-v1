import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';

export default function AutopilotImpact() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="✈️"
          title={t('screens.admin.autopilotImpact')}
          description="Measure the impact of automated actions on community health"
        />
        <AdminEmptyState
          title={t('screens.admin.autopilotImpactMetrics')}
          description="Autopilot impact metrics coming soon — actions delivered, acceptance rate, top automations."
        />
      </div>
    </AppLayout>
  );
}
