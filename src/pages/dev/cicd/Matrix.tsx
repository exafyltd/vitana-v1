import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevStatusGrid } from "@/components/dev/DevStatusGrid";
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
import { Plus, Grid3X3, Server, Lock } from "lucide-react";
import { devCICDNavigation } from "@/config/dev-navigation";
import { useCICDStatus } from "@/hooks/dev/useCICDStatus";
import { useTelemetry } from "@/hooks/dev/useTelemetry";

export default function CICDMatrix() {
  const [activeTab, setActiveTab] = useState("environments");
  const { health, lock, isLoading: cicdLoading } = useCICDStatus();
  const { snapshot, isLoading: telemetryLoading } = useTelemetry();

  const pipelines = health?.pipelines || [];
  const services = snapshot?.services || [];

  return (
    <>
      <SEO title="Vitana DEV — Environment Matrix" description="Environment matrix and service deployment status" canonical={window.location.href} />
      <SubNavigation items={devCICDNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Environment Matrix" description="Environment matrix and service deployment status" emoji="🔲" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search environments…" onSearch={(q) => console.log('Search:', q)} />
            <UniversalCalendarButton />
            <Button size="sm" disabled><Plus className="w-4 h-4 mr-2" />New Environment</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Services" value={pipelines.length} icon={Server} />
            <DevMetricsCard title="Environments" value={1} icon={Grid3X3} subtitle="Production" />
            <DevMetricsCard title="Deploy Lock" value={lock?.locked ? "Locked" : "Open"} icon={Lock} variant={lock?.locked ? "warning" : "success"} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="environments">Environment Grid</SplitBarTrigger>
              <SplitBarTrigger value="results">Service Status</SplitBarTrigger>
              <SplitBarTrigger value="parallel">Health Matrix</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="environments" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Service x Environment Matrix</CardTitle><CardDescription>Deployment status per service per environment</CardDescription></CardHeader>
                <CardContent>
                  {pipelines.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium">Service</th>
                            <th className="text-center p-2 font-medium">Production</th>
                            <th className="text-center p-2 font-medium">Pipeline</th>
                            <th className="text-center p-2 font-medium">SHA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pipelines.map(p => (
                            <tr key={p.service} className="border-b">
                              <td className="p-2 font-medium">{p.service}</td>
                              <td className="p-2 text-center">
                                <Badge className={p.status === "passing" ? "bg-green-100 text-green-800" : p.status === "failing" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>{p.status}</Badge>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`inline-block w-3 h-3 rounded-full ${p.status === "passing" ? "bg-green-500" : p.status === "failing" ? "bg-red-500" : "bg-yellow-500"}`} />
                              </td>
                              <td className="p-2 text-center"><code className="text-xs">{p.git_sha.substring(0, 8)}</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <div className="text-center py-12 text-muted-foreground">No pipeline data available</div>}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="results" className="mt-6">
              <DevStatusGrid
                title="Pipeline Status"
                description="Current CI/CD pipeline status per service"
                items={pipelines.map(p => ({
                  name: p.service,
                  status: p.status === "passing" ? "healthy" as const : p.status === "failing" ? "down" as const : "degraded" as const,
                  detail: `SHA: ${p.git_sha.substring(0, 8)} — ${(p.duration_ms / 1000).toFixed(1)}s`,
                }))}
                isLoading={cicdLoading}
              />
            </SplitBarContent>

            <SplitBarContent value="parallel" className="mt-6">
              <DevStatusGrid
                title="Service Health Matrix"
                description="Runtime health from telemetry snapshot"
                items={services.map(s => ({
                  name: s.name,
                  status: s.status,
                  detail: `Error rate: ${(s.error_rate * 100).toFixed(1)}%`,
                  latency_ms: s.latency_ms,
                }))}
                isLoading={telemetryLoading}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
