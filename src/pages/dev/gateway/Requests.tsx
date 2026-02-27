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
import { Filter, Globe, Activity, AlertTriangle } from "lucide-react";
import { devGatewayNavigation } from "@/config/dev-navigation";
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

const requestColumns: DevDataColumn<GatewayEvent & Record<string, unknown>>[] = [
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
    className: "max-w-[300px]",
    render: (row) => <code className="text-xs">{row.path}</code>,
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
  {
    key: "timestamp",
    label: "Time",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.timestamp), { addSuffix: true })}
      </span>
    ),
  },
];

export default function GatewayRequests() {
  const [activeTab, setActiveTab] = useState("logs");
  const { events, error, available, isLoading, refetch } = useGatewayLogs({ limit: 100 });

  const eventsAsRecords = events.map(e => ({ ...e } as GatewayEvent & Record<string, unknown>));

  const avgLatency = useMemo(() => {
    if (events.length === 0) return 0;
    return Math.round(events.reduce((sum, e) => sum + e.latency_ms, 0) / events.length);
  }, [events]);

  const errorCount = useMemo(() => events.filter(e => e.status_code >= 400).length, [events]);
  const errorRate = events.length > 0 ? ((errorCount / events.length) * 100).toFixed(1) : "0";

  return (
    <>
      <SEO
        title="Vitana DEV — Gateway Requests"
        description="Gateway request logs and monitoring"
        canonical={window.location.href}
      />

      <SubNavigation items={devGatewayNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Gateway Requests"
            description="Gateway request logs and monitoring"
            emoji="🌐"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search requests…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}>
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={4}>
            <DevMetricsCard title="Total Requests" value={events.length} icon={Globe} />
            <DevMetricsCard title="Avg Latency" value={`${avgLatency}ms`} icon={Activity} variant={avgLatency > 500 ? "warning" : "success"} />
            <DevMetricsCard title="Errors" value={errorCount} icon={AlertTriangle} variant={errorCount > 0 ? "danger" : "success"} />
            <DevMetricsCard title="Error Rate" value={`${errorRate}%`} variant={Number(errorRate) > 5 ? "danger" : "success"} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="logs">Request Logs</SplitBarTrigger>
              <SplitBarTrigger value="performance">Response Times</SplitBarTrigger>
              <SplitBarTrigger value="errors">Errors ({errorCount})</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="logs" className="mt-6">
              <DevDataTable
                title="Gateway Request Logs"
                description="HTTP requests passing through the gateway"
                columns={requestColumns}
                data={eventsAsRecords}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter by method, path, tenant…"
                searchKeys={["method", "path", "tenant"]}
                emptyMessage="No gateway requests logged yet"
              />
            </SplitBarContent>

            <SplitBarContent value="performance" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Latency Distribution</CardTitle>
                  <CardDescription>Request latency breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length > 0 ? (
                    <div className="space-y-3">
                      {[
                        { label: "< 100ms", count: events.filter(e => e.latency_ms < 100).length, color: "bg-green-500" },
                        { label: "100-300ms", count: events.filter(e => e.latency_ms >= 100 && e.latency_ms < 300).length, color: "bg-blue-500" },
                        { label: "300-500ms", count: events.filter(e => e.latency_ms >= 300 && e.latency_ms < 500).length, color: "bg-yellow-500" },
                        { label: "500ms+", count: events.filter(e => e.latency_ms >= 500).length, color: "bg-red-500" },
                      ].map(bucket => {
                        const pct = events.length > 0 ? Math.round((bucket.count / events.length) * 100) : 0;
                        return (
                          <div key={bucket.label} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{bucket.label}</span>
                              <span className="text-muted-foreground">{bucket.count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className={`h-2 rounded-full ${bucket.color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">No latency data available</div>
                  )}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="errors" className="mt-6">
              <DevDataTable
                title="Error Requests"
                description="Requests with 4xx/5xx status codes"
                columns={requestColumns}
                data={eventsAsRecords.filter(e => (e.status_code as number) >= 400)}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter errors…"
                searchKeys={["method", "path", "tenant"]}
                emptyMessage="No errors — all requests successful"
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
