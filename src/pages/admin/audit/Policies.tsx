/**
 * Audit & Compliance > Policies — placeholder for governance policies and compliance rules
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function AuditPolicies() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="audit" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📜"
          title="Policies"
          description="Define and manage governance policies and compliance rules for your tenant"
        />

        <AdminEmptyState
          title="Policy management coming soon"
          description="Configure data retention policies, access control rules, content moderation policies, and compliance requirements (HIPAA, GDPR, SOC2). This feature is under development."
        />
      </div>
    </AppLayout>
  );
}
