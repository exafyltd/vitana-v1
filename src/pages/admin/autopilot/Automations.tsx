/**
 * Autopilot > Automations tab
 *
 * Shows the real AP-XXXX catalog (116 automations from automation-registry.ts)
 * with per-tenant binding status. Admins can enable/disable automations.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationCatalog, useUpsertBinding } from "@/hooks/useAdminAutopilot";
import { t } from '@/lib/i18n-toast';

const DOMAIN_VARIANT: Record<string, "active" | "warning" | "error" | "info" | "inactive"> = {
  "connect-people": "active",
  "community-groups": "active",
  "events-live-rooms": "info",
  "sharing-growth": "warning",
  "engagement-loops": "active",
  "health-wellness": "info",
  "payments-wallet-vtn": "warning",
  "personalization-engines": "info",
  "memory-intelligence": "info",
  "platform-operations": "inactive",
  "business-hub-marketplace": "warning",
  "live-rooms-commerce": "info",
  "onboarding-growth": "active",
};

const STATUS_VARIANT: Record<string, "active" | "warning" | "error" | "inactive"> = {
  IMPLEMENTED: "active",
  LIVE: "active",
  PLANNED: "inactive",
  IN_PROGRESS: "warning",
  DEPRECATED: "error",
};

const TRIGGER_ICON: Record<string, string> = {
  cron: "⏰",
  event: "⚡",
  heartbeat: "❤",
  manual: "✋",
  webhook: "🔗",
};

function formatTrigger(entry: { trigger_type: string; trigger_config: any }): string {
  const icon = TRIGGER_ICON[entry.trigger_type] || "";
  if (!entry.trigger_config) return `${icon} ${entry.trigger_type}`;
  if (entry.trigger_config.cronExpression) return `${icon} ${entry.trigger_config.cronExpression}`;
  if (entry.trigger_config.eventTopic) return `${icon} ${entry.trigger_config.eventTopic}`;
  if (entry.trigger_config.intervalMinutes) return `${icon} ${entry.trigger_config.intervalMinutes}m`;
  return `${icon} ${entry.trigger_type}`;
}

export default function AutopilotAutomations() {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const catalogQuery = useAutomationCatalog();
  const upsertBinding = useUpsertBinding();

  const catalog = catalogQuery.data || [];
  const enabledCount = catalog.filter(a => a.enabled).length;
  const implementedCount = catalog.filter(a => a.has_handler).length;

  const filtered = catalog.filter(a => {
    if (domainFilter !== "all" && a.domain !== domainFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    }
    return true;
  });

  function handleToggle(entry: typeof catalog[0]) {
    upsertBinding.mutate({
      automation_id: entry.id,
      enabled: !entry.enabled,
      requires_approval: entry.binding?.requires_approval ?? true,
    });
  }

  function handleReset() {
    setSearch("");
    setDomainFilter("all");
    setStatusFilter("all");
  }

  // Extract unique domains from catalog
  const domains = [...new Set(catalog.map(a => a.domain))].sort();

  return (
    <AppLayout>
      <AdminTabs sectionKey="autopilot" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="⚡"
          title={t('screens.admin.activeAutomations')}
          description={`${enabledCount} of ${catalog.length} automations enabled`}
        />

        <div className="flex flex-wrap gap-2">
          <AdminStatusBadge variant="active">{t('screens.admin.enabledEnabledcount', { enabledCount })}</AdminStatusBadge>
          <AdminStatusBadge variant="info">{t('screens.admin.executableImplementedcount', { implementedCount })}</AdminStatusBadge>
          <AdminStatusBadge variant="inactive">Planned: {catalog.length - implementedCount}</AdminStatusBadge>
          <AdminStatusBadge variant="warning">{t('screens.admin.totalLength', { length: catalog.length })}</AdminStatusBadge>
        </div>

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or AP-XXXX..."
          filters={[
            {
              value: domainFilter,
              onChange: setDomainFilter,
              placeholder: "All domains",
              options: [
                { value: "all", label: "All domains" },
                ...domains.map(d => ({ value: d, label: d.replace(/-/g, " ") })),
              ],
            },
            {
              value: statusFilter,
              onChange: setStatusFilter,
              placeholder: "All statuses",
              options: [
                { value: "all", label: "All statuses" },
                { value: "IMPLEMENTED", label: "Implemented" },
                { value: "PLANNED", label: "Planned" },
                { value: "LIVE", label: "Live" },
              ],
            },
          ]}
          onReset={handleReset}
        />

        {catalogQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingAutomations')}</p>
        )}

        {catalogQuery.isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {(catalogQuery.error as Error)?.message || "Failed to load automations"}
          </p>
        )}

        {!catalogQuery.isLoading && filtered.length === 0 && (
          <AdminEmptyState
            title={t('screens.admin.noAutomationsFound')}
            description="Try a different search or filter."
          />
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <Card key={entry.id} className={entry.enabled ? "border-green-200 dark:border-green-800" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{entry.id}</span>
                    <AdminStatusBadge variant={STATUS_VARIANT[entry.status] || "inactive"}>
                      {entry.status}
                    </AdminStatusBadge>
                  </div>
                  {entry.has_handler && (
                    <Switch
                      checked={entry.enabled}
                      onCheckedChange={() => handleToggle(entry)}
                      disabled={upsertBinding.isPending}
                    />
                  )}
                </div>
                <CardTitle className="text-sm font-medium leading-tight">{entry.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <AdminStatusBadge variant={DOMAIN_VARIANT[entry.domain] || "inactive"}>
                    {entry.domain.replace(/-/g, " ")}
                  </AdminStatusBadge>
                  <span className="text-muted-foreground">{formatTrigger(entry)}</span>
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {Array.isArray(entry.target_roles) ? entry.target_roles.join(", ") : "all roles"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
