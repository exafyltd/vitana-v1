/**
 * Members > Audit tab (thin v1)
 *
 * Shows a placeholder for the member-scoped audit trail (grants, revokes,
 * invites, role changes). Full audit functionality ships in Batch 1.D
 * (Audit & Compliance section); this tab will cross-link to it.
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';

export default function MembersAudit() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="members" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📋"
          title={t('screens.admin.memberAuditTrail')}
          description="Track role grants, revocations, invitations, and membership changes for this tenant"
        />

        <AdminEmptyState
          title={t('screens.admin.auditTrailComingWave1Batch')}
          description="Every role grant, revoke, and invitation action will be logged here with timestamps and actor details. This tab will connect to the full Audit & Compliance section."
        />
      </div>
    </AppLayout>
  );
}
