import { useState, useMemo } from "react";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevEventStream } from "@/components/dev/DevEventStream";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Filter, Bell, AlertTriangle, AlertCircle } from "lucide-react";
import { devDashboardNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { OasisEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const alertColumns: DevDataColumn<OasisEvent & Record<string, unknown>>[] = [
  {
    key: "created_at",
    label: "Time",
    sortable: true,
    render: (row) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</span>,
  },
  {
    key: "status",
    label: "Severity",
    sortable: true,
    render: (row) => <Badge className={`text-xs ${row.status === "red" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{row.status === "red" ? "Critical" : "Warning"}</Badge>,
  },
  {
    key: "service",
    label: "Source",
    sortable: true,
    render: (row) => <span className="font-medium text-sm">{row.service}</span>,
  },
  {
    key: "message",
    label: "Message",
    className: "max-w-[400px]",
    render: (row) => <span className="text-sm truncate block">{row.message}</span>,
  },
  {
    key: "vtid",
    label: "VTID",
    render: (row) => row.vtid ? <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge> : <span className="text-muted-foreground">—</span>,
  },
];

export default function DashboardAlerts() {
  const [activeTab, setActiveTab] = useState("active");
  const { events: redEvents, error: redError, available: redAvailable, isLoading: redLoading, refetch: redRefetch } = useOasisEvents({ status: "red", limit: 50 });
  const { events: yellowEvents, error: yellowError, available: yellowAvailable, isLoading: yellowLoading, refetch: yellowRefetch } = useOasisEvents({ status: "yellow", limit: 50 });

  const allAlerts = useMemo(() => {
    const combined = [...redEvents, ...yellowEvents];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  }, [redEvents, yellowEvents]);

  const alertsAsRecords = allAlerts.map(e => ({ ...e } as OasisEvent & Record<string, unknown>));

  const handleRefresh = () => { redRefetch(); yellowRefetch(); };

  return (
    <>
      <SEO title="Vitana DEV — System Alerts" description="Active alerts and warning notifications" canonical={window.location.href} />
      <SubNavigation items={devDashboardNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="System Alerts" description="Active alerts and warning notifications" emoji="🔔" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search alerts…" onSearch={(q) => console.log('Search:', q)} />
            <Button size="sm" onClick={handleRefresh}><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Total Alerts" value={allAlerts.length} icon={Bell} variant={allAlerts.length > 0 ? "warning" : "default"} />
            <DevMetricsCard title="Critical" value={redEvents.length} icon={AlertCircle} variant={redEvents.length > 0 ? "danger" : "success"} />
            <DevMetricsCard title="Warnings" value={yellowEvents.length} icon={AlertTriangle} variant={yellowEvents.length > 0 ? "warning" : "success"} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="active">Active Alerts ({allAlerts.length})</SplitBarTrigger>
              <SplitBarTrigger value="critical">Critical ({redEvents.length})</SplitBarTrigger>
              <SplitBarTrigger value="stream">Alert Stream</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="active" className="mt-6">
              <DevDataTable title="All Alerts" description="Active critical and warning alerts" columns={alertColumns} data={alertsAsRecords} isLoading={redLoading || yellowLoading} error={redError || yellowError} available={redAvailable || yellowAvailable} onRefresh={handleRefresh} searchable searchPlaceholder="Filter alerts…" searchKeys={["service", "message", "vtid", "status"]} emptyMessage="No active alerts — system healthy" />
            </SplitBarContent>

            <SplitBarContent value="critical" className="mt-6">
              <DevDataTable title="Critical Alerts" description="Red-status events requiring immediate attention" columns={alertColumns} data={redEvents.map(e => ({ ...e } as OasisEvent & Record<string, unknown>))} isLoading={redLoading} error={redError} available={redAvailable} onRefresh={redRefetch} searchable searchPlaceholder="Filter critical alerts…" searchKeys={["service", "message", "vtid"]} emptyMessage="No critical alerts" />
            </SplitBarContent>

            <SplitBarContent value="stream" className="mt-6">
              <DevEventStream
                title="Alert Stream"
                description="Live stream of warning and critical events"
                events={allAlerts.map(e => ({ ...e, id: e.id }))}
                isLoading={redLoading || yellowLoading}
                error={redError || yellowError}
                available={redAvailable || yellowAvailable}
                onRefresh={handleRefresh}
                emptyMessage="No alerts — all systems operational"
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
