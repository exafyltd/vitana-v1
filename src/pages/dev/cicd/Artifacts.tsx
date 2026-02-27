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
import { Filter, Package, Archive, Download } from "lucide-react";
import { devCICDNavigation } from "@/config/dev-navigation";
import { useCICDStatus } from "@/hooks/dev/useCICDStatus";
import { formatDistanceToNow } from "date-fns";

interface ArtifactRecord extends Record<string, unknown> {
  service: string;
  tag: string;
  duration_ms: number;
  git_sha: string;
  last_run: string;
  status: string;
}

const artifactColumns: DevDataColumn<ArtifactRecord>[] = [
  {
    key: "service",
    label: "Service",
    sortable: true,
    render: (row) => <span className="font-medium text-sm">{row.service}</span>,
  },
  {
    key: "tag",
    label: "Image Tag",
    render: (row) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.tag}</code>,
  },
  {
    key: "git_sha",
    label: "Git SHA",
    render: (row) => <code className="text-xs text-muted-foreground">{(row.git_sha as string).substring(0, 8)}</code>,
  },
  {
    key: "duration_ms",
    label: "Build Time",
    sortable: true,
    render: (row) => <span className="text-xs font-mono">{((row.duration_ms as number) / 1000).toFixed(1)}s</span>,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => (
      <Badge className={`text-xs ${row.status === "passing" ? "bg-green-100 text-green-800" : row.status === "failing" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: "last_run",
    label: "Built",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.last_run as string), { addSuffix: true })}
      </span>
    ),
  },
];

export default function CICDArtifacts() {
  const [activeTab, setActiveTab] = useState("registry");
  const { health, error, available, isLoading, refetch } = useCICDStatus();

  const artifacts: ArtifactRecord[] = (health?.pipelines || []).map(p => ({
    ...p,
    tag: `${p.service}:${p.git_sha.substring(0, 8)}`,
  } as ArtifactRecord));

  return (
    <>
      <SEO
        title="Vitana DEV — Build Artifacts"
        description="Build artifacts and deployables"
        canonical={window.location.href}
      />

      <SubNavigation items={devCICDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Build Artifacts"
            description="Build artifacts and deployables"
            emoji="📦"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search artifacts…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}>
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Artifacts" value={artifacts.length} icon={Package} />
            <DevMetricsCard title="Successful Builds" value={artifacts.filter(a => a.status === "passing").length} icon={Archive} variant="success" />
            <DevMetricsCard title="Failed Builds" value={artifacts.filter(a => a.status === "failing").length} variant={artifacts.some(a => a.status === "failing") ? "danger" : "default"} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="registry">Artifact Registry</SplitBarTrigger>
              <SplitBarTrigger value="downloads">Download Links</SplitBarTrigger>
              <SplitBarTrigger value="metadata">Artifact Details</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="registry" className="mt-6">
              <DevDataTable
                title="Build Artifacts"
                description="Recent build artifacts from CI/CD pipelines"
                columns={artifactColumns}
                data={artifacts}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter by service, tag, SHA…"
                searchKeys={["service", "tag", "git_sha", "status"]}
                emptyMessage="No build artifacts available"
              />
            </SplitBarContent>

            <SplitBarContent value="downloads" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Artifact Downloads</CardTitle>
                  <CardDescription>Download links for latest successful builds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {artifacts.filter(a => a.status === "passing").map(a => (
                      <div key={a.service} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <span className="font-medium text-sm">{a.service}</span>
                          <p className="text-xs text-muted-foreground">Tag: {a.tag}</p>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                    {artifacts.filter(a => a.status === "passing").length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No successful builds to download</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="metadata" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Artifact Metadata</CardTitle>
                  <CardDescription>Detailed build information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {artifacts.map(a => (
                      <div key={a.service} className="p-4 rounded-lg border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{a.service}</span>
                          <Badge className={a.status === "passing" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{a.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>Tag: <code>{a.tag}</code></div>
                          <div>SHA: <code>{(a.git_sha as string).substring(0, 8)}</code></div>
                          <div>Build time: {((a.duration_ms as number) / 1000).toFixed(1)}s</div>
                          <div>Built: {formatDistanceToNow(new Date(a.last_run as string), { addSuffix: true })}</div>
                        </div>
                      </div>
                    ))}
                    {artifacts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No artifact metadata</div>
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
