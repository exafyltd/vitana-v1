/**
 * Settings > Feature Flags — toggle tenant feature flags
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/useAdminSettings";
import { toast } from "sonner";
import { t } from '@/lib/i18n-toast';

const KNOWN_FLAGS = [
  { key: "enable_voice_widget", label: "Voice Widget", description: "Enable the ORB voice assistant widget" },
  { key: "enable_autopilot", label: "Autopilot", description: "Enable AI-powered autopilot recommendations" },
  { key: "enable_knowledge_base", label: "Knowledge Base", description: "Enable the knowledge base for members" },
  { key: "enable_navigator", label: "Navigator", description: "Enable the guided journey navigator" },
  { key: "enable_notifications", label: "Notifications", description: "Enable push and in-app notifications" },
] as const;

export default function SettingsFeatureFlags() {
  const settingsQuery = useTenantSettings();
  const updateMutation = useUpdateTenantSettings();
  const flags = (settingsQuery.data?.feature_flags || {}) as Record<string, boolean>;

  const handleToggle = (key: string, checked: boolean) => {
    const updated = { ...flags, [key]: checked };
    updateMutation.mutate(
      { feature_flags: updated },
      {
        onSuccess: () => toast.success(`${key} ${checked ? "enabled" : "disabled"}`),
        onError: (err) => toast.error((err as Error).message || "Failed to update"),
      }
    );
  };

  return (
    <AppLayout>
      <AdminTabs sectionKey="settings" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🚩"
          title={t('screens.admin.featureFlags')}
          description="Toggle features on or off for your tenant"
        />

        {settingsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingFeatureFlags')}</p>
        )}

        {settingsQuery.data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {KNOWN_FLAGS.map((flag) => (
                <div key={flag.key} className="flex items-start gap-3">
                  <Checkbox
                    id={flag.key}
                    checked={!!flags[flag.key]}
                    onCheckedChange={(checked) => handleToggle(flag.key, !!checked)}
                    disabled={updateMutation.isPending}
                  />
                  <div>
                    <label htmlFor={flag.key} className="text-sm font-medium cursor-pointer">
                      {flag.label}
                    </label>
                    <p className="text-xs text-muted-foreground">{flag.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
