/**
 * Settings > Domains — placeholder for custom domain and subdomain configuration
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';

export default function SettingsDomains() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="settings" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🌐"
          title={t('screens.admin.domains')}
          description="Configure custom domains and subdomains for your tenant"
        />

        <AdminEmptyState
          title={t('screens.admin.domainConfigurationComingSoon')}
          description="Set up custom domains (e.g., community.yourcompany.com), manage SSL certificates, and configure subdomain routing for your tenant. This feature is under development."
        />
      </div>
    </AppLayout>
  );
}
