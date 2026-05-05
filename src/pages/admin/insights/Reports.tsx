import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';

export default function Reports() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📑"
          title={t('screens.admin.reports')}
          description="Build and schedule custom tenant-specific reports"
        />
        <AdminEmptyState
          title={t('screens.admin.customReports')}
          description="Custom reports coming soon — build and schedule tenant-specific reports."
        />
      </div>
    </AppLayout>
  );
}
