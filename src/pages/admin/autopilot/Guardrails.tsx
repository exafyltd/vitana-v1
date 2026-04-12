/**
 * Autopilot > Guardrails tab
 *
 * Tenant-level autopilot configuration: enable/disable, risk caps,
 * allowed domains, rate limits, auto-activation threshold.
 */

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAutopilotSettings, useUpdateAutopilotSettings } from "@/hooks/useAdminAutopilot";
import type { AutopilotSettings } from "@/hooks/useAdminAutopilot";

const ALL_DOMAINS = ["health", "community", "longevity", "professional", "general"];
const ALL_RISK_LEVELS = ["low", "medium", "high"];

export default function AutopilotGuardrails() {
  const settingsQuery = useAutopilotSettings();
  const updateSettings = useUpdateAutopilotSettings();

  const [form, setForm] = useState<Partial<AutopilotSettings>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setForm({
        enabled: settingsQuery.data.enabled,
        max_recommendations_per_day: settingsQuery.data.max_recommendations_per_day,
        max_activations_per_day: settingsQuery.data.max_activations_per_day,
        allowed_domains: settingsQuery.data.allowed_domains,
        allowed_risk_levels: settingsQuery.data.allowed_risk_levels,
        auto_activate_threshold: settingsQuery.data.auto_activate_threshold,
        recommendation_retention_days: settingsQuery.data.recommendation_retention_days,
      });
      setDirty(false);
    }
  }, [settingsQuery.data]);

  function updateField<K extends keyof AutopilotSettings>(key: K, value: AutopilotSettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function toggleArrayItem(key: "allowed_domains" | "allowed_risk_levels", item: string) {
    const current = (form[key] as string[]) || [];
    const next = current.includes(item)
      ? current.filter(d => d !== item)
      : [...current, item];
    updateField(key, next as any);
  }

  function handleSave() {
    updateSettings.mutate(form);
    setDirty(false);
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="autopilot" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🛡️"
          title="Guardrails"
          description="Control what the autopilot is allowed to do in your tenant"
        />

        {settingsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading settings...</p>
        )}

        {settingsQuery.isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {(settingsQuery.error as Error)?.message || "Failed to load settings"}
          </p>
        )}

        {settingsQuery.data && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Master switch */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Autopilot Enabled</CardTitle>
                    <CardDescription>
                      When disabled, no recommendations are generated or shown for this tenant.
                    </CardDescription>
                  </div>
                  <Switch
                    checked={form.enabled ?? true}
                    onCheckedChange={(checked) => updateField("enabled", checked)}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Allowed domains */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Allowed Domains</CardTitle>
                <CardDescription className="text-xs">
                  Which recommendation domains are visible to this tenant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {ALL_DOMAINS.map((domain) => (
                  <div key={domain} className="flex items-center gap-2">
                    <Checkbox
                      id={`domain-${domain}`}
                      checked={(form.allowed_domains || []).includes(domain)}
                      onCheckedChange={() => toggleArrayItem("allowed_domains", domain)}
                    />
                    <Label htmlFor={`domain-${domain}`} className="text-sm capitalize">{domain}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Allowed risk levels */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Allowed Risk Levels</CardTitle>
                <CardDescription className="text-xs">
                  Maximum risk level the autopilot can recommend.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {ALL_RISK_LEVELS.map((level) => (
                  <div key={level} className="flex items-center gap-2">
                    <Checkbox
                      id={`risk-${level}`}
                      checked={(form.allowed_risk_levels || []).includes(level)}
                      onCheckedChange={() => toggleArrayItem("allowed_risk_levels", level)}
                    />
                    <Label htmlFor={`risk-${level}`} className="text-sm capitalize">
                      {level}
                      {level === "high" && (
                        <span className="ml-1 text-xs text-destructive">(destructive actions possible)</span>
                      )}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Rate limits */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Rate Limits</CardTitle>
                <CardDescription className="text-xs">
                  Cap how many recommendations and activations per day.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Max recommendations / day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.max_recommendations_per_day ?? 20}
                    onChange={(e) => updateField("max_recommendations_per_day", parseInt(e.target.value) || 20)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max activations / day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.max_activations_per_day ?? 10}
                    onChange={(e) => updateField("max_activations_per_day", parseInt(e.target.value) || 10)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Auto-activation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Auto-Activation</CardTitle>
                <CardDescription className="text-xs">
                  Recommendations above this confidence threshold auto-execute without manual approval. Leave empty to require manual approval for all.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-xs">Confidence threshold (0.0 - 1.0)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.auto_activate_threshold ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : parseFloat(e.target.value);
                      updateField("auto_activate_threshold", v as any);
                    }}
                    placeholder="Disabled (manual only)"
                    className="mt-1"
                  />
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Retention (days)</Label>
                  <Input
                    type="number"
                    min={7}
                    max={365}
                    value={form.recommendation_retention_days ?? 30}
                    onChange={(e) => updateField("recommendation_retention_days", parseInt(e.target.value) || 30)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {dirty && (
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (settingsQuery.data) {
                  setForm({
                    enabled: settingsQuery.data.enabled,
                    max_recommendations_per_day: settingsQuery.data.max_recommendations_per_day,
                    max_activations_per_day: settingsQuery.data.max_activations_per_day,
                    allowed_domains: settingsQuery.data.allowed_domains,
                    allowed_risk_levels: settingsQuery.data.allowed_risk_levels,
                    auto_activate_threshold: settingsQuery.data.auto_activate_threshold,
                    recommendation_retention_days: settingsQuery.data.recommendation_retention_days,
                  });
                  setDirty(false);
                }
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {updateSettings.isSuccess && !dirty && (
          <p className="text-sm text-green-600 dark:text-green-400 text-center">Settings saved successfully.</p>
        )}
      </div>
    </AppLayout>
  );
}
