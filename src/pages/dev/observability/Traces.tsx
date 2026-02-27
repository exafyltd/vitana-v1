import { useState, useMemo } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Filter, Route, Clock, AlertTriangle } from "lucide-react";
import { devObservabilityNavigation } from "@/config/dev-navigation";
import { useGatewayLogs } from "@/hooks/dev/useGatewayLogs";
import { GatewayEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const methodColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800",
  POST: "bg-green-100 text-green-800",
  PUT: "bg-yellow-100 text-yellow-800",
  DELETE: "bg-red-100 text-red-800",
  PATCH: "bg-purple-100 text-purple-800",
};

const traceColumns: DevDataColumn<GatewayEvent & Record<string, unknown>>[] = [
  {
    key: "timestamp",
    label: "Time",
    sortable: true,
    render: (row) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(row.timestamp), { addSuffix: true })}</span>,
  },
  {
    key: "method",
    label: "Method",
    sortable: true,
    render: (row) => <Badge className={`text-xs font-mono ${methodColors[row.method] || "bg-gray-100"}`}>{row.method}</Badge>,
  },
  {
    key: "path",
    label: "Path",
    sortable: true,
    className: "max-w-[250px]",
    render: (row) => <code className="text-xs truncate block">{row.path}</code>,
  },
  {
    key: "status_code",
    label: "Status",
    sortable: true,
    render: (row) => {
      const code = row.status_code as number;
      const color = code < 300 ? "bg-green-100 text-green-800" : code < 400 ? "bg-blue-100 text-blue-800" : code < 500 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
      return <Badge className={`text-xs ${color}`}>{code}</Badge>;
    },
  },
  {
    key: "latency_ms",
    label: "Latency",
    sortable: true,
    render: (row) => {
      const ms = row.latency_ms as number;
      const color = ms < 200 ? "text-green-600" : ms < 500 ? "text-yellow-600" : "text-red-600";
      return <span className={`text-xs font-mono ${color}`}>{ms}ms</span>;
    },
  },
  {
    key: "tenant",
    label: "Tenant",
    sortable: true,
    render: (row) => <Badge variant="outline" className="text-xs">{row.tenant}</Badge>,
  },
];

export default function ObservabilityTraces() {
  const [activeTab, setActiveTab] = useState("traces");
  const { events, error, available, isLoading, refetch } = useGatewayLogs({ limit: 100 });
  const eventsAsRecords = events.map(e => ({ ...e } as GatewayEvent & Record<string, unknown>));

  const slowRequests = useMemo(() => eventsAsRecords.filter(e => (e.latency_ms as number) > 500), [eventsAsRecords]);
  const avgLatency = useMemo(() => events.length > 0 ? Math.round(events.reduce((s, e) => s + e.latency_ms, 0) / events.length) : 0, [events]);

  return (
    <>
      <SEO title="Vitana DEV — Request Traces" description="Request tracing and latency analysis" canonical={window.location.href} />
      <SubNavigation items={devObservabilityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Request Traces" description="Request tracing and latency analysis" emoji="🔍" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search traces…" onSearch={(q) => console.log('Search:', q)} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={4}>
            <DevMetricsCard title="Total Traces" value={events.length} icon={Route} />
            <DevMetricsCard title="Avg Latency" value={`${avgLatency}ms`} icon={Clock} variant={avgLatency > 500 ? "warning" : "success"} />
            <DevMetricsCard title="Slow Requests" value={slowRequests.length} icon={AlertTriangle} variant={slowRequests.length > 0 ? "warning" : "success"} subtitle="> 500ms" />
            <DevMetricsCard title="Error Traces" value={events.filter(e => e.status_code >= 400).length} variant={events.some(e => e.status_code >= 400) ? "danger" : "success"} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="traces">All Traces</SplitBarTrigger>
              <SplitBarTrigger value="slow">Slow Requests ({slowRequests.length})</SplitBarTrigger>
              <SplitBarTrigger value="waterfall">Trace Waterfall</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="traces" className="mt-6">
              <DevDataTable title="Request Traces" description="All gateway requests with timing data" columns={traceColumns} data={eventsAsRecords} isLoading={isLoading} error={error} available={available} onRefresh={refetch} searchable searchPlaceholder="Filter by path, method, tenant…" searchKeys={["method", "path", "tenant"]} emptyMessage="No traces recorded" />
            </SplitBarContent>

            <SplitBarContent value="slow" className="mt-6">
              <DevDataTable title="Slow Requests" description="Requests exceeding 500ms threshold" columns={traceColumns} data={slowRequests} isLoading={isLoading} error={error} available={available} onRefresh={refetch} searchable searchPlaceholder="Filter slow requests…" searchKeys={["method", "path", "tenant"]} emptyMessage="No slow requests — all within threshold" />
            </SplitBarContent>

            <SplitBarContent value="waterfall" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Trace Waterfall</CardTitle><CardDescription>Visual latency timeline for recent requests</CardDescription></CardHeader>
                <CardContent>
                  {events.length > 0 ? (
                    <div className="space-y-2">
                      {events.slice(0, 20).map(e => {
                        const maxMs = Math.max(...events.slice(0, 20).map(ee => ee.latency_ms));
                        const pct = maxMs > 0 ? Math.max(5, Math.round((e.latency_ms / maxMs) * 100)) : 5;
                        const color = e.latency_ms < 200 ? "bg-green-500" : e.latency_ms < 500 ? "bg-yellow-500" : "bg-red-500";
                        return (
                          <div key={e.id} className="flex items-center gap-2">
                            <Badge className={`text-xs font-mono w-12 justify-center ${methodColors[e.method] || "bg-gray-100"}`}>{e.method}</Badge>
                            <code className="text-xs w-48 truncate">{e.path}</code>
                            <div className="flex-1 bg-muted rounded-full h-3">
                              <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-16 text-right">{e.latency_ms}ms</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="text-center py-12 text-muted-foreground">No trace data for waterfall view</div>}
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
