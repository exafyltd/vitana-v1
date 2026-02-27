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
import { Play, TestTube2, CheckSquare, BarChart3 } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { OasisEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const qaColumns: DevDataColumn<OasisEvent & Record<string, unknown>>[] = [
  {
    key: "created_at",
    label: "Time",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
      </span>
    ),
  },
  {
    key: "vtid",
    label: "VTID",
    sortable: true,
    render: (row) => row.vtid ? <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge> : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "type",
    label: "Test Type",
    sortable: true,
    render: (row) => <Badge variant="outline" className="text-xs">{row.type}</Badge>,
  },
  {
    key: "status",
    label: "Result",
    sortable: true,
    render: (row) => {
      const isPass = row.status === "green" || row.message?.toLowerCase().includes("pass");
      return (
        <Badge className={`text-xs ${isPass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {isPass ? "Pass" : "Fail"}
        </Badge>
      );
    },
  },
  {
    key: "service",
    label: "Service",
    sortable: true,
  },
  {
    key: "message",
    label: "Details",
    className: "max-w-[300px]",
    render: (row) => <span className="text-sm truncate block">{row.message}</span>,
  },
];

export default function AgentsQATest() {
  const [activeTab, setActiveTab] = useState("suites");
  const { events, error, available, isLoading, refetch } = useOasisEvents({ type: "vtid.stage.qa", limit: 100 });

  const eventsAsRecords = events.map(e => ({ ...e } as OasisEvent & Record<string, unknown>));

  const passCount = useMemo(() => events.filter(e => e.status === "green" || e.message?.toLowerCase().includes("pass")).length, [events]);
  const failCount = events.length - passCount;

  const suiteMap = useMemo(() => {
    const map = new Map<string, { total: number; passed: number; failed: number }>();
    for (const e of events) {
      const suite = e.service || "unknown";
      const entry = map.get(suite) || { total: 0, passed: 0, failed: 0 };
      entry.total++;
      if (e.status === "green" || e.message?.toLowerCase().includes("pass")) entry.passed++;
      else entry.failed++;
      map.set(suite, entry);
    }
    return map;
  }, [events]);

  return (
    <>
      <SEO
        title="Vitana DEV — QA & Test Agents"
        description="Automated test results and QA reports"
        canonical={window.location.href}
      />

      <SubNavigation items={devAgentsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="QA & Test Agents"
            description="Automated test results and QA reports"
            emoji="🧪"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search tests…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" disabled>
              <Play className="w-4 h-4 mr-2" />
              Run Tests
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={4}>
            <DevMetricsCard title="Total Tests" value={events.length} icon={TestTube2} />
            <DevMetricsCard title="Passed" value={passCount} icon={CheckSquare} variant="success" />
            <DevMetricsCard title="Failed" value={failCount} variant={failCount > 0 ? "danger" : "default"} />
            <DevMetricsCard title="Test Suites" value={suiteMap.size} icon={BarChart3} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="suites">Test Suites</SplitBarTrigger>
              <SplitBarTrigger value="results">Test Results</SplitBarTrigger>
              <SplitBarTrigger value="coverage">Coverage</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="suites" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Suites by Service</CardTitle>
                  <CardDescription>Aggregated test results per service</CardDescription>
                </CardHeader>
                <CardContent>
                  {suiteMap.size === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No test suites found</div>
                  ) : (
                    <div className="space-y-3">
                      {Array.from(suiteMap.entries()).map(([suite, stats]) => (
                        <div key={suite} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <TestTube2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{suite}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 text-xs">{stats.passed} passed</Badge>
                            {stats.failed > 0 && <Badge className="bg-red-100 text-red-800 text-xs">{stats.failed} failed</Badge>}
                            <Badge variant="outline" className="text-xs">{stats.total} total</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="results" className="mt-6">
              <DevDataTable
                title="Test Results"
                description="Individual test execution results"
                columns={qaColumns}
                data={eventsAsRecords}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter by VTID, service, type…"
                searchKeys={["vtid", "service", "type", "message"]}
                emptyMessage="No test results yet"
              />
            </SplitBarContent>

            <SplitBarContent value="coverage" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coverage Metrics</CardTitle>
                  <CardDescription>Test coverage data from QA runs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from(suiteMap.entries()).map(([suite, stats]) => {
                      const pct = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
                      return (
                        <div key={suite} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{suite}</span>
                            <span className="text-muted-foreground">{pct}% pass rate</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${pct > 90 ? "bg-green-500" : pct > 70 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {suiteMap.size === 0 && (
                      <div className="text-center py-12 text-muted-foreground">No coverage data available</div>
                    )}
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
