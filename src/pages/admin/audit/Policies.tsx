/**
 * Audit & Compliance > Policies — placeholder for governance policies and compliance rules
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';

export default function AuditPolicies() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="audit" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📜"
          title={t('screens.admin.policies')}
          description="Define and manage governance policies and compliance rules for your tenant"
        />

        <AdminEmptyState
          title={t('screens.admin.policyManagementComingSoon')}
          description="Configure data retention policies, access control rules, content moderation policies, and compliance requirements (HIPAA, GDPR, SOC2). This feature is under development."
        />
      </div>
    </AppLayout>
  );
}
