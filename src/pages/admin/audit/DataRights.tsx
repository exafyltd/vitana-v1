/**
 * Audit & Compliance > Data Rights — placeholder for GDPR export/delete functionality
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';
import { ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

export default function AuditDataRights() {
  const spotlight = useSpotlightEnabled();
  const adminBody = (
    <>
        <AdminHeader
          emoji="🛡️"
          title={t('screens.admin.dataRights')}
          description="Manage GDPR data subject requests, exports, and deletions"
        />

        <AdminEmptyState
          title={t('screens.admin.dataRightsManagementComingSoon')}
          description="Process data subject access requests (DSARs), export member data, handle right-to-deletion requests, and maintain an audit trail of all data rights operations. This feature is under development."
        />
    </>
  );

  return (
    <AppLayout>
      <AdminTabs sectionKey="audit" />
      {spotlight ? (
        <ScreenFrame archetype="workspace">
          <div className="space-y-4">{adminBody}</div>
        </ScreenFrame>
      ) : (
        <div className="p-6 space-y-4">{adminBody}</div>
      )}
    </AppLayout>
  );
}
