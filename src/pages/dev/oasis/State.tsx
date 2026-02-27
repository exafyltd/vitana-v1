import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevStatusGrid, StatusItem } from "@/components/dev/DevStatusGrid";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevEventStream } from "@/components/dev/DevEventStream";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Download, Shield, Zap, ToggleLeft, Hash } from "lucide-react";
import { devOasisNavigation } from "@/config/dev-navigation";
import { useGovernance } from "@/hooks/dev/useGovernance";
import { useAllocatorStatus } from "@/hooks/dev/useVTIDLedger";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";

export default function OasisState() {
  const [activeTab, setActiveTab] = useState("snapshots");
  const { governance, error: govError, available: govAvailable, isLoading: govLoading, refetch: govRefetch } = useGovernance();
  const { allocator, error: allocError, available: allocAvailable, isLoading: allocLoading } = useAllocatorStatus();
  const { events: stateEvents, error: eventsError, available: eventsAvailable, isLoading: eventsLoading, refetch: eventsRefetch } = useOasisEvents({ type: "governance", limit: 50 });

  const statusItems: StatusItem[] = governance ? [
    {
      name: "Execution Mode",
      status: governance.execution_disarmed ? "degraded" : "healthy",
      detail: governance.execution_disarmed ? "DISARMED — execution paused" : "ARMED — executing normally",
    },
    {
      name: "Autopilot Loop",
      status: governance.autopilot_loop_enabled ? "healthy" : "degraded",
      detail: governance.autopilot_loop_enabled ? "Enabled — autonomous loop active" : "Disabled — manual mode",
    },
    {
      name: "VTID Allocator",
      status: governance.vtid_allocator_enabled ? "healthy" : "degraded",
      detail: governance.vtid_allocator_enabled ? "Enabled — allocating VTIDs" : "Disabled — allocation paused",
    },
    {
      name: "Governance Rules",
      status: (governance.active_rules || 0) > 0 ? "healthy" : "unknown",
      detail: `${governance.active_rules || 0} active rules`,
    },
  ] : [];

  return (
    <>
      <SEO
        title="Vitana DEV — OASIS State"
        description="OASIS state snapshots and current state management"
        canonical={window.location.href}
      />

      <SubNavigation items={devOasisNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="OASIS State"
            description="OASIS state snapshots and current state management"
            emoji="💾"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search state…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => govRefetch()}>
              <Download className="w-4 h-4 mr-2" />
              Export Snapshot
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="snapshots">State Snapshots</SplitBarTrigger>
              <SplitBarTrigger value="diff">Governance Details</SplitBarTrigger>
              <SplitBarTrigger value="history">State History</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="snapshots" className="mt-6">
              <div className="space-y-6">
                <DevStatusGrid
                  title="System State"
                  description="Current governance and allocator status flags"
                  items={statusItems}
                  isLoading={govLoading}
                />

                <DevMetricsGrid columns={4}>
                  <DevMetricsCard
                    title="Active Rules"
                    value={governance?.active_rules ?? "—"}
                    icon={Shield}
                    variant={governance?.active_rules ? "default" : "warning"}
                  />
                  <DevMetricsCard
                    title="Execution"
                    value={governance?.execution_disarmed ? "Disarmed" : "Armed"}
                    icon={Zap}
                    variant={governance?.execution_disarmed ? "warning" : "success"}
                  />
                  <DevMetricsCard
                    title="Autopilot"
                    value={governance?.autopilot_loop_enabled ? "On" : "Off"}
                    icon={ToggleLeft}
                    variant={governance?.autopilot_loop_enabled ? "success" : "default"}
                  />
                  <DevMetricsCard
                    title="Next VTID"
                    value={allocator?.next_vtid ?? "—"}
                    subtitle={allocator ? `${allocator.total_allocated} total allocated` : undefined}
                    icon={Hash}
                  />
                </DevMetricsGrid>
              </div>
            </SplitBarContent>

            <SplitBarContent value="diff" className="mt-6">
              <div className="space-y-6">
                <DevMetricsGrid columns={3}>
                  <DevMetricsCard
                    title="Allocator Enabled"
                    value={allocator?.enabled ? "Yes" : "No"}
                    variant={allocator?.enabled ? "success" : "warning"}
                  />
                  <DevMetricsCard
                    title="Total Allocated"
                    value={allocator?.total_allocated ?? "—"}
                  />
                  <DevMetricsCard
                    title="Last Allocated"
                    value={allocator?.last_allocated ? new Date(allocator.last_allocated).toLocaleString() : "Never"}
                  />
                </DevMetricsGrid>

                {governance?.rules && governance.rules.length > 0 && (
                  <DevStatusGrid
                    title="Governance Rules"
                    description="Individual rule states"
                    items={governance.rules.map(r => ({
                      name: r.name,
                      status: r.enabled ? "healthy" as const : "degraded" as const,
                      detail: `Priority ${r.priority} — ${r.condition} → ${r.action}`,
                    }))}
                  />
                )}
              </div>
            </SplitBarContent>

            <SplitBarContent value="history" className="mt-6">
              <DevEventStream
                title="State Change History"
                description="Recent governance and state change events"
                events={stateEvents.map(e => ({ ...e, id: e.id }))}
                isLoading={eventsLoading}
                error={eventsError}
                available={eventsAvailable}
                onRefresh={eventsRefetch}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
