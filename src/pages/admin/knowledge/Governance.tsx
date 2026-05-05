/**
 * Knowledge > Governance tab
 *
 * Placeholder v1 — describes upcoming governance features.
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';

export default function KnowledgeGovernance() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="knowledge" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🛡️"
          title={t('screens.admin.knowledgeGovernance')}
          description="Control how knowledge is sourced, reviewed, and expired across your tenant."
        />

        <AdminEmptyState
          title={t('screens.admin.comingSoon')}
          description="This tab will include: source attribution tracking (which documents contributed to each answer), document review workflows (approve/reject before indexing), automatic document expiry policies, and content quality scoring. These features are in development."
        />
      </div>
    </AppLayout>
  );
}
