import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Filter, RotateCcw, AlertTriangle, Clock } from "lucide-react";
import { devPipelinesNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { useCICDStatus } from "@/hooks/dev/useCICDStatus";
import { OasisEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const rollbackColumns: DevDataColumn<OasisEvent & Record<string, unknown>>[] = [
  {
    key: "created_at",
    label: "Time",
    sortable: true,
    render: (row) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</span>,
  },
  {
    key: "service",
    label: "Service",
    sortable: true,
    render: (row) => <span className="font-medium text-sm">{row.service}</span>,
  },
  {
    key: "vtid",
    label: "VTID",
    sortable: true,
    render: (row) => row.vtid ? <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge> : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => <Badge className={`text-xs ${row.status === "green" ? "bg-green-100 text-green-800" : row.status === "red" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{row.status}</Badge>,
  },
  {
    key: "message",
    label: "Reason",
    className: "max-w-[300px]",
    render: (row) => <span className="text-sm truncate block">{row.message}</span>,
  },
];

export default function PipelinesRollbacks() {
  const [activeTab, setActiveTab] = useState("history");
  const { events, error, available, isLoading, refetch } = useOasisEvents({ type: "vtid.lifecycle", limit: 100 });
  const { approvals } = useCICDStatus();

  const rollbackEvents = events.filter(e => e.message?.toLowerCase().includes("rollback") || e.type?.includes("rollback"));
  const rollbackEventsAsRecords = rollbackEvents.map(e => ({ ...e } as OasisEvent & Record<string, unknown>));
  const rollbackApprovals = approvals.filter(a => a.type === "rollback");

  return (
    <>
      <SEO title="Vitana DEV — Rollbacks" description="Rollback history and events" canonical={window.location.href} />
      <SubNavigation items={devPipelinesNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Rollbacks" description="Rollback history and events" emoji="⏪" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search rollbacks…" onSearch={(q) => console.log('Search:', q)} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Rollback Events" value={rollbackEvents.length} icon={RotateCcw} variant={rollbackEvents.length > 0 ? "warning" : "default"} />
            <DevMetricsCard title="Pending Approvals" value={rollbackApprovals.filter(a => a.status === "pending").length} icon={AlertTriangle} variant={rollbackApprovals.some(a => a.status === "pending") ? "warning" : "default"} />
            <DevMetricsCard title="Lifecycle Events" value={events.length} icon={Clock} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="history">Rollback History</SplitBarTrigger>
              <SplitBarTrigger value="approvals">Rollback Approvals</SplitBarTrigger>
              <SplitBarTrigger value="all">All Lifecycle Events</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="history" className="mt-6">
              <DevDataTable title="Rollback Events" description="Service rollback events from OASIS" columns={rollbackColumns} data={rollbackEventsAsRecords} isLoading={isLoading} error={error} available={available} onRefresh={refetch} searchable searchPlaceholder="Filter rollbacks…" searchKeys={["service", "vtid", "message"]} emptyMessage="No rollback events — all deployments stable" />
            </SplitBarContent>

            <SplitBarContent value="approvals" className="mt-6">
              <DevDataTable
                title="Rollback Approvals"
                description="Pending and completed rollback approvals"
                columns={[
                  { key: "vtid", label: "VTID", sortable: true, render: (row: Record<string, unknown>) => <Badge variant="secondary" className="text-xs font-mono">{row.vtid as string}</Badge> },
                  { key: "service", label: "Service", sortable: true },
                  { key: "requestor", label: "Requestor", sortable: true },
                  { key: "status", label: "Status", sortable: true, render: (row: Record<string, unknown>) => <Badge className={`text-xs ${row.status === "pending" ? "bg-yellow-100 text-yellow-800" : row.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{row.status as string}</Badge> },
                  { key: "created_at", label: "Requested", sortable: true, render: (row: Record<string, unknown>) => <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(row.created_at as string), { addSuffix: true })}</span> },
                ]}
                data={rollbackApprovals.map(a => ({ ...a } as Record<string, unknown>))}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter approvals…"
                searchKeys={["vtid", "service", "requestor"]}
                emptyMessage="No rollback approvals"
              />
            </SplitBarContent>

            <SplitBarContent value="all" className="mt-6">
              <DevDataTable title="Lifecycle Events" description="All VTID lifecycle events" columns={rollbackColumns} data={events.map(e => ({ ...e } as OasisEvent & Record<string, unknown>))} isLoading={isLoading} error={error} available={available} onRefresh={refetch} searchable searchPlaceholder="Filter events…" searchKeys={["service", "vtid", "message", "type"]} emptyMessage="No lifecycle events" />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
