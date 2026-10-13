/**
 * Settings > Integrations — placeholder for webhook / API key / external service config
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { t } from '@/lib/i18n-toast';
import { ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

export default function SettingsIntegrations() {
  const spotlight = useSpotlightEnabled();
  const adminBody = (
    <>
        <AdminHeader
          emoji="🔗"
          title={t('screens.admin.integrations')}
          description="Connect external services, manage webhooks, and configure API keys"
        />

        <AdminEmptyState
          title={t('screens.admin.integrationsComingSoon')}
          description="Configure webhook endpoints, manage API keys for external services, and connect third-party tools like Slack, Zapier, and CRM systems. This feature is under development."
        />
    </>
  );

  return (
    <AppLayout>
      <AdminTabs sectionKey="settings" />
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
