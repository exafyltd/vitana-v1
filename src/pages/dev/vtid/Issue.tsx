import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevStatusGrid } from "@/components/dev/DevStatusGrid";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, Hash, Layers } from "lucide-react";
import { devVTIDNavigation } from "@/config/dev-navigation";
import { useAllocatorStatus, useVTIDLedger } from "@/hooks/dev/useVTIDLedger";
import { useGovernance } from "@/hooks/dev/useGovernance";
import { VTIDRecord } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const recentColumns: DevDataColumn<VTIDRecord & Record<string, unknown>>[] = [
  {
    key: "vtid",
    label: "VTID",
    sortable: true,
    render: (row) => <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge>,
  },
  {
    key: "title",
    label: "Title",
    sortable: true,
    className: "max-w-[300px]",
    render: (row) => <span className="text-sm truncate block">{row.title}</span>,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => <Badge variant="outline" className="text-xs">{row.status}</Badge>,
  },
  {
    key: "target_roles",
    label: "Target Roles",
    render: (row) => (
      <div className="flex gap-1 flex-wrap">
        {(row.target_roles as string[]).map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
      </div>
    ),
  },
  {
    key: "created_at",
    label: "Issued",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.created_at as string), { addSuffix: true })}
      </span>
    ),
  },
];

export default function VTIDIssue() {
  const [activeTab, setActiveTab] = useState("form");
  const { allocator, error: allocError, available: allocAvailable, isLoading: allocLoading } = useAllocatorStatus();
  const { vtids, error: vtidsError, available: vtidsAvailable, isLoading: vtidsLoading, refetch: vtidsRefetch } = useVTIDLedger({ limit: 25 });
  const { governance } = useGovernance();

  const vtidsAsRecords = vtids.map(v => ({ ...v } as VTIDRecord & Record<string, unknown>));

  return (
    <>
      <SEO
        title="Vitana DEV — VTID Issuance"
        description="Issue new VTIDs and manage VTID creation"
        canonical={window.location.href}
      />

      <SubNavigation items={devVTIDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="VTID Issuance"
            description="Issue new VTIDs and manage VTID creation (read-only in Phase 1)"
            emoji="🎫"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search recent issuances…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              Issue VTID
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="form">Allocator Status</SplitBarTrigger>
              <SplitBarTrigger value="recent">Recent Issuances</SplitBarTrigger>
              <SplitBarTrigger value="rules">Issuance Rules</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="form" className="mt-6">
              <div className="space-y-6">
                <DevMetricsGrid columns={4}>
                  <DevMetricsCard
                    title="Allocator"
                    value={allocator?.enabled ? "Enabled" : "Disabled"}
                    variant={allocator?.enabled ? "success" : "warning"}
                    icon={Layers}
                  />
                  <DevMetricsCard
                    title="Next VTID"
                    value={allocator?.next_vtid ?? "—"}
                    icon={Hash}
                  />
                  <DevMetricsCard
                    title="Total Allocated"
                    value={allocator?.total_allocated ?? "—"}
                  />
                  <DevMetricsCard
                    title="Last Allocated"
                    value={allocator?.last_allocated ? formatDistanceToNow(new Date(allocator.last_allocated), { addSuffix: true }) : "Never"}
                  />
                </DevMetricsGrid>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">VTID Issuance Form</CardTitle>
                    <CardDescription>Issuance is disabled in read-only mode. Enable write mode to allocate new VTIDs.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 opacity-50">
                      <div>
                        <label className="text-sm text-muted-foreground">Title</label>
                        <input className="w-full mt-1 px-3 py-2 border rounded-md bg-muted" placeholder="VTID title…" disabled />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Target Roles</label>
                        <input className="w-full mt-1 px-3 py-2 border rounded-md bg-muted" placeholder="e.g. worker, validator" disabled />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm text-muted-foreground">Description</label>
                        <textarea className="w-full mt-1 px-3 py-2 border rounded-md bg-muted" rows={3} placeholder="VTID description…" disabled />
                      </div>
                    </div>
                    <Button disabled className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Allocate VTID (Read-Only Mode)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>

            <SplitBarContent value="recent" className="mt-6">
              <DevDataTable
                title="Recent Issuances"
                description="Recently issued VTIDs and their metadata"
                columns={recentColumns}
                data={vtidsAsRecords}
                isLoading={vtidsLoading}
                error={vtidsError}
                available={vtidsAvailable}
                onRefresh={vtidsRefetch}
                searchable
                searchPlaceholder="Filter recent issuances…"
                searchKeys={["vtid", "title", "status"]}
                emptyMessage="No VTIDs issued yet"
              />
            </SplitBarContent>

            <SplitBarContent value="rules" className="mt-6">
              <DevStatusGrid
                title="Issuance Governance"
                description="Rules affecting VTID issuance"
                items={[
                  {
                    name: "Execution Mode",
                    status: governance?.execution_disarmed ? "degraded" : "healthy",
                    detail: governance?.execution_disarmed ? "Disarmed — new VTIDs won't execute" : "Armed — VTIDs will execute normally",
                  },
                  {
                    name: "VTID Allocator",
                    status: governance?.vtid_allocator_enabled ? "healthy" : "degraded",
                    detail: governance?.vtid_allocator_enabled ? "Enabled — allocation active" : "Disabled — allocation paused",
                  },
                  {
                    name: "Autopilot",
                    status: governance?.autopilot_loop_enabled ? "healthy" : "degraded",
                    detail: governance?.autopilot_loop_enabled ? "Enabled — auto-issuance possible" : "Disabled — manual issuance only",
                  },
                ]}
                isLoading={allocLoading}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
