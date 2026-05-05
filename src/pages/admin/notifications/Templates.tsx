import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';

export default function Templates() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="notifications" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📋"
          title={t('screens.admin.templates')}
          description="Create and manage reusable notification templates"
        />
        <AdminEmptyState
          title={t('screens.admin.notificationTemplates')}
          description="Notification templates coming soon — create reusable templates for campaigns."
        />
      </div>
    </AppLayout>
  );
}
