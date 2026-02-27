import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { ToggleLeft, Flag, Shield, Lock } from "lucide-react";
import { devSettingsNavigation } from "@/config/dev-navigation";
import { useGovernance } from "@/hooks/dev/useGovernance";

export default function SettingsFlags() {
  const [activeTab, setActiveTab] = useState("current");
  const { governance, isLoading, refetch } = useGovernance();

  const flags = [
    { name: "EXECUTION_DISARMED", value: governance?.execution_disarmed ?? false, desc: "Disables task execution system-wide" },
    { name: "AUTOPILOT_LOOP_ENABLED", value: governance?.autopilot_loop_enabled ?? false, desc: "Enables autonomous task loop" },
    { name: "VTID_ALLOCATOR_ENABLED", value: governance?.vtid_allocator_enabled ?? false, desc: "Enables VTID allocation system" },
    { name: "DEV_HUB_READONLY", value: true, desc: "Dev Hub operates in read-only mode (Phase 1)" },
  ];

  const enabledCount = flags.filter(f => f.value).length;

  return (
    <>
      <SEO title="Vitana DEV — Feature Flags" description="Feature flags and governance toggles" canonical={window.location.href} />
      <SubNavigation items={devSettingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Feature Flags" description="Feature flags and governance toggles (read-only)" emoji="🚩" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search flags…" onSearch={(q) => console.log('Search:', q)} />
            <Button size="sm" variant="outline" disabled><Lock className="w-4 h-4 mr-2" />Read-Only</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Total Flags" value={flags.length} icon={Flag} />
            <DevMetricsCard title="Enabled" value={enabledCount} icon={ToggleLeft} variant="success" />
            <DevMetricsCard title="Governance Rules" value={governance?.active_rules ?? 0} icon={Shield} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="current">Current Flags</SplitBarTrigger>
              <SplitBarTrigger value="governance">Governance State</SplitBarTrigger>
              <SplitBarTrigger value="env">Environment Vars</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="current" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Feature Flags</CardTitle><CardDescription>Current feature flag values (toggles disabled in read-only mode)</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {flags.map(flag => (
                      <div key={flag.name} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="space-y-1">
                          <code className="text-sm font-medium">{flag.name}</code>
                          <p className="text-xs text-muted-foreground">{flag.desc}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={flag.value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{flag.value ? "ON" : "OFF"}</Badge>
                          <div className={`w-10 h-5 rounded-full cursor-not-allowed ${flag.value ? "bg-green-500" : "bg-gray-300"}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mt-0.5 ${flag.value ? "ml-5" : "ml-0.5"}`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="governance" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Governance State</CardTitle><CardDescription>Full governance status from gateway</CardDescription></CardHeader>
                <CardContent>
                  {governance ? (
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(governance, null, 2)}</pre>
                  ) : <div className="text-center py-12 text-muted-foreground">{isLoading ? "Loading…" : "Governance data not available"}</div>}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="env" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Environment Variables</CardTitle><CardDescription>Dev Hub configuration from environment</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { key: "VITE_DEV_HUB_ENABLED", value: "true" },
                      { key: "VITE_DEV_HUB_READONLY", value: "true" },
                      { key: "VITE_GATEWAY_BASE", value: "(configured)" },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                        <code className="text-xs">{item.key}</code>
                        <Badge variant="outline" className="text-xs">{item.value}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
