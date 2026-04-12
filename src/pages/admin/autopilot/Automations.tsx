/**
 * Autopilot > Automations tab
 *
 * Shows the AP catalog with per-tenant binding status. Admins can enable/disable
 * automations and configure per-binding overrides (approval, rate limits).
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationCatalog, useUpsertBinding } from "@/hooks/useAdminAutopilot";

const CATEGORY_VARIANT: Record<string, "active" | "warning" | "error" | "info" | "inactive"> = {
  community: "active",
  health: "info",
  professional: "warning",
  general: "inactive",
};

export default function AutopilotAutomations() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const catalogQuery = useAutomationCatalog();
  const upsertBinding = useUpsertBinding();

  const catalog = catalogQuery.data || [];
  const enabledCount = catalog.filter(a => a.enabled).length;

  const filtered = catalog.filter(a => {
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }
    return true;
  });

  function handleToggle(entry: typeof catalog[0]) {
    upsertBinding.mutate({
      automation_id: entry.id,
      enabled: !entry.enabled,
      requires_approval: entry.binding?.requires_approval ?? entry.requires_approval_default,
    });
  }

  function handleReset() {
    setSearch("");
    setCategoryFilter("all");
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="autopilot" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="⚡"
          title="Active Automations"
          description={`${enabledCount} of ${catalog.length} automations enabled`}
        />

        <div className="flex flex-wrap gap-2">
          <AdminStatusBadge variant="active">Enabled: {enabledCount}</AdminStatusBadge>
          <AdminStatusBadge variant="inactive">Available: {catalog.length - enabledCount}</AdminStatusBadge>
        </div>

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search automations..."
          filters={[
            {
              value: categoryFilter,
              onChange: setCategoryFilter,
              placeholder: "All categories",
              options: [
                { value: "all", label: "All categories" },
                { value: "community", label: "Community" },
                { value: "health", label: "Health" },
                { value: "professional", label: "Professional" },
                { value: "general", label: "General" },
              ],
            },
          ]}
          onReset={handleReset}
        />

        {catalogQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading automations...</p>
        )}

        {catalogQuery.isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {(catalogQuery.error as Error)?.message || "Failed to load automations"}
          </p>
        )}

        {!catalogQuery.isLoading && filtered.length === 0 && (
          <AdminEmptyState
            title="No automations found"
            description="Try a different search or category filter."
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => (
            <Card key={entry.id} className={entry.enabled ? "border-green-200 dark:border-green-800" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{entry.name}</CardTitle>
                  <Switch
                    checked={entry.enabled}
                    onCheckedChange={() => handleToggle(entry)}
                    disabled={upsertBinding.isPending}
                  />
                </div>
                <CardDescription className="text-xs">{entry.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 text-xs">
                  <AdminStatusBadge variant={CATEGORY_VARIANT[entry.category] || "inactive"}>
                    {entry.category}
                  </AdminStatusBadge>
                  <AdminStatusBadge variant={entry.risk_level === "low" ? "active" : entry.risk_level === "medium" ? "warning" : "error"}>
                    {entry.risk_level} risk
                  </AdminStatusBadge>
                  <span className="text-muted-foreground">{entry.default_schedule}</span>
                  {entry.binding?.requires_approval && (
                    <span className="text-amber-600 dark:text-amber-400">requires approval</span>
                  )}
                </div>
                {entry.binding && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {entry.binding.max_runs_per_day && `Max ${entry.binding.max_runs_per_day} runs/day`}
                    {entry.binding.max_runs_per_day && entry.binding.max_runs_per_user_per_day && " · "}
                    {entry.binding.max_runs_per_user_per_day && `${entry.binding.max_runs_per_user_per_day} per user/day`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
