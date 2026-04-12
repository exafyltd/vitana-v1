/**
 * Settings > Domains — placeholder for custom domain and subdomain configuration
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function SettingsDomains() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="settings" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🌐"
          title="Domains"
          description="Configure custom domains and subdomains for your tenant"
        />

        <AdminEmptyState
          title="Domain configuration coming soon"
          description="Set up custom domains (e.g., community.yourcompany.com), manage SSL certificates, and configure subdomain routing for your tenant. This feature is under development."
        />
      </div>
    </AppLayout>
  );
}
