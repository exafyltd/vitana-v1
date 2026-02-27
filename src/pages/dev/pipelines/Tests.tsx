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
import { Filter, TestTube2, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { devPipelinesNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { OasisEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const testColumns: DevDataColumn<OasisEvent & Record<string, unknown>>[] = [
  {
    key: "created_at",
    label: "Time",
    sortable: true,
    render: (row) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</span>,
  },
  {
    key: "vtid",
    label: "VTID",
    sortable: true,
    render: (row) => row.vtid ? <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge> : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "service",
    label: "Suite",
    sortable: true,
    render: (row) => <span className="font-medium text-sm">{row.service}</span>,
  },
  {
    key: "status",
    label: "Result",
    sortable: true,
    render: (row) => {
      const pass = row.status === "green" || row.message?.toLowerCase().includes("pass");
      return <Badge className={`text-xs ${pass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{pass ? "Pass" : "Fail"}</Badge>;
    },
  },
  {
    key: "message",
    label: "Details",
    className: "max-w-[300px]",
    render: (row) => <span className="text-sm truncate block">{row.message}</span>,
  },
];

export default function PipelinesTests() {
  const [activeTab, setActiveTab] = useState("results");
  const { events, error, available, isLoading, refetch } = useOasisEvents({ type: "vtid.stage.qa", limit: 100 });
  const eventsAsRecords = events.map(e => ({ ...e } as OasisEvent & Record<string, unknown>));

  const passCount = useMemo(() => events.filter(e => e.status === "green" || e.message?.toLowerCase().includes("pass")).length, [events]);
  const failCount = events.length - passCount;

  const suites = useMemo(() => {
    const map = new Map<string, { total: number; passed: number }>();
    for (const e of events) {
      const s = e.service || "unknown";
      const entry = map.get(s) || { total: 0, passed: 0 };
      entry.total++;
      if (e.status === "green" || e.message?.toLowerCase().includes("pass")) entry.passed++;
      map.set(s, entry);
    }
    return map;
  }, [events]);

  return (
    <>
      <SEO title="Vitana DEV — Pipeline Tests" description="Test results and QA pipeline output" canonical={window.location.href} />
      <SubNavigation items={devPipelinesNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Pipeline Tests" description="Test results and QA pipeline output" emoji="🧪" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search tests…" onSearch={(q) => console.log('Search:', q)} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={4}>
            <DevMetricsCard title="Total Tests" value={events.length} icon={TestTube2} />
            <DevMetricsCard title="Passed" value={passCount} icon={CheckCircle} variant="success" />
            <DevMetricsCard title="Failed" value={failCount} icon={XCircle} variant={failCount > 0 ? "danger" : "default"} />
            <DevMetricsCard title="Pass Rate" value={events.length > 0 ? `${((passCount / events.length) * 100).toFixed(1)}%` : "—"} icon={BarChart3} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="results">Test Results</SplitBarTrigger>
              <SplitBarTrigger value="suites">Test Suites</SplitBarTrigger>
              <SplitBarTrigger value="trends">Coverage</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="results" className="mt-6">
              <DevDataTable title="Test Results" description="Individual test execution results" columns={testColumns} data={eventsAsRecords} isLoading={isLoading} error={error} available={available} onRefresh={refetch} searchable searchPlaceholder="Filter by VTID, suite…" searchKeys={["vtid", "service", "message"]} emptyMessage="No test results" />
            </SplitBarContent>

            <SplitBarContent value="suites" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Test Suites</CardTitle><CardDescription>Results aggregated by service</CardDescription></CardHeader>
                <CardContent>
                  {suites.size > 0 ? (
                    <div className="space-y-3">
                      {Array.from(suites.entries()).map(([name, stats]) => {
                        const pct = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
                        return (
                          <div key={name} className="space-y-1">
                            <div className="flex justify-between text-sm"><span className="font-medium">{name}</span><span className="text-muted-foreground">{stats.passed}/{stats.total} ({pct}%)</span></div>
                            <div className="w-full bg-muted rounded-full h-2"><div className={`h-2 rounded-full ${pct > 90 ? "bg-green-500" : pct > 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="text-center py-12 text-muted-foreground">No suite data</div>}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="trends" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Coverage Summary</CardTitle><CardDescription>Overall test coverage metrics</CardDescription></CardHeader>
                <CardContent>
                  <DevMetricsGrid columns={3}>
                    <DevMetricsCard title="Suites Tracked" value={suites.size} />
                    <DevMetricsCard title="Overall Pass Rate" value={events.length > 0 ? `${((passCount / events.length) * 100).toFixed(0)}%` : "—"} variant={passCount / Math.max(events.length, 1) > 0.9 ? "success" : "warning"} />
                    <DevMetricsCard title="Recent Failures" value={failCount} variant={failCount > 0 ? "danger" : "success"} />
                  </DevMetricsGrid>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
