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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Filter, PlayCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { devCICDNavigation } from "@/config/dev-navigation";
import { useCICDStatus } from "@/hooks/dev/useCICDStatus";
import { formatDistanceToNow } from "date-fns";

interface PipelineRecord extends Record<string, unknown> {
  service: string;
  status: string;
  last_run: string;
  duration_ms: number;
  git_sha: string;
}

const runColumns: DevDataColumn<PipelineRecord>[] = [
  { key: "service", label: "Service", sortable: true, render: (row) => <span className="font-medium text-sm">{row.service}</span> },
  {
    key: "status", label: "Status", sortable: true,
    render: (row) => <Badge className={`text-xs ${row.status === "passing" ? "bg-green-100 text-green-800" : row.status === "failing" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{row.status}</Badge>,
  },
  { key: "git_sha", label: "Git SHA", render: (row) => <code className="text-xs text-muted-foreground">{(row.git_sha as string).substring(0, 8)}</code> },
  {
    key: "duration_ms", label: "Duration", sortable: true,
    render: (row) => <span className="text-xs font-mono">{((row.duration_ms as number) / 1000).toFixed(1)}s</span>,
  },
  {
    key: "last_run", label: "Last Run", sortable: true,
    render: (row) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(row.last_run as string), { addSuffix: true })}</span>,
  },
];

export default function CICDRuns() {
  const [activeTab, setActiveTab] = useState("history");
  const [selectedRun, setSelectedRun] = useState<PipelineRecord | null>(null);
  const { health, lock, error, available, isLoading, refetch } = useCICDStatus();

  const pipelines: PipelineRecord[] = (health?.pipelines || []).map(p => ({ ...p } as PipelineRecord));
  const passingCount = pipelines.filter(p => p.status === "passing").length;
  const failingCount = pipelines.filter(p => p.status === "failing").length;

  return (
    <>
      <SEO title="Vitana DEV — CI/CD Runs" description="CI/CD workflow runs and execution history" canonical={window.location.href} />
      <SubNavigation items={devCICDNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="CI/CD Runs" description="CI/CD workflow runs and execution history" emoji="▶️" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search runs…" onSearch={(q) => console.log('Search:', q)} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={4}>
            <DevMetricsCard title="Pipelines" value={pipelines.length} icon={PlayCircle} />
            <DevMetricsCard title="Passing" value={passingCount} icon={CheckCircle} variant="success" />
            <DevMetricsCard title="Failing" value={failingCount} icon={XCircle} variant={failingCount > 0 ? "danger" : "default"} />
            <DevMetricsCard title="Deploy Lock" value={lock?.locked ? "Locked" : "Open"} icon={Clock} variant={lock?.locked ? "warning" : "success"} subtitle={lock?.locked ? `by ${lock.locked_by}` : undefined} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="history">Run History</SplitBarTrigger>
              <SplitBarTrigger value="details">Run Details</SplitBarTrigger>
              <SplitBarTrigger value="metrics">Duration Metrics</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="history" className="mt-6">
              <DevDataTable title="Pipeline Runs" description="CI/CD pipeline execution history" columns={runColumns} data={pipelines} isLoading={isLoading} error={error} available={available} onRefresh={refetch} onRowClick={(row) => { setSelectedRun(row); setActiveTab("details"); }} searchable searchPlaceholder="Filter by service, status…" searchKeys={["service", "status", "git_sha"]} emptyMessage="No pipeline runs recorded" />
            </SplitBarContent>

            <SplitBarContent value="details" className="mt-6">
              {selectedRun ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{selectedRun.service}</CardTitle>
                      <Badge className={selectedRun.status === "passing" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{selectedRun.status}</Badge>
                    </div>
                    <CardDescription>Pipeline run detail</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-sm text-muted-foreground">Service</p><p className="font-medium mt-1">{selectedRun.service}</p></div>
                      <div><p className="text-sm text-muted-foreground">Status</p><p className="font-medium mt-1">{selectedRun.status}</p></div>
                      <div><p className="text-sm text-muted-foreground">Git SHA</p><code className="text-sm mt-1 block">{selectedRun.git_sha}</code></div>
                      <div><p className="text-sm text-muted-foreground">Duration</p><p className="font-medium mt-1">{((selectedRun.duration_ms as number) / 1000).toFixed(1)}s</p></div>
                      <div><p className="text-sm text-muted-foreground">Last Run</p><p className="font-medium mt-1">{new Date(selectedRun.last_run as string).toLocaleString()}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Select a pipeline run to view details</CardContent></Card>
              )}
            </SplitBarContent>

            <SplitBarContent value="metrics" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Build Duration</CardTitle><CardDescription>Pipeline execution times</CardDescription></CardHeader>
                <CardContent>
                  {pipelines.length > 0 ? (
                    <div className="space-y-3">
                      {pipelines.map(p => {
                        const maxMs = Math.max(...pipelines.map(pp => pp.duration_ms as number));
                        const pct = maxMs > 0 ? Math.max(5, Math.round(((p.duration_ms as number) / maxMs) * 100)) : 5;
                        const dur = (p.duration_ms as number) / 1000;
                        return (
                          <div key={p.service} className="space-y-1">
                            <div className="flex justify-between text-sm"><span className="font-medium">{p.service}</span><span className="text-muted-foreground">{dur.toFixed(1)}s</span></div>
                            <div className="w-full bg-muted rounded-full h-2"><div className={`h-2 rounded-full ${p.status === "passing" ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="text-center py-12 text-muted-foreground">No duration data</div>}
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
