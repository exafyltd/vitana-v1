import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';
import { ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

export default function Reports() {
  const spotlight = useSpotlightEnabled();
  const adminBody = (
    <>
        <AdminHeader
          emoji="📑"
          title={t('screens.admin.reports')}
          description="Build and schedule custom tenant-specific reports"
        />
        <AdminEmptyState
          title={t('screens.admin.customReports')}
          description="Custom reports coming soon — build and schedule tenant-specific reports."
        />
    </>
  );

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      {spotlight ? (
        <ScreenFrame archetype="workspace">
          <div className="space-y-6">{adminBody}</div>
        </ScreenFrame>
      ) : (
        <div className="p-6 space-y-6">{adminBody}</div>
      )}
    </AppLayout>
  );
}
