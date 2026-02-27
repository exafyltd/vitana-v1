import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
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
import { Filter, Bird, Activity, Shield } from "lucide-react";
import { devPipelinesNavigation } from "@/config/dev-navigation";
import { useCICDStatus } from "@/hooks/dev/useCICDStatus";
import { useTelemetry } from "@/hooks/dev/useTelemetry";

export default function PipelinesCanary() {
  const [activeTab, setActiveTab] = useState("status");
  const { health } = useCICDStatus();
  const { snapshot, isLoading } = useTelemetry();

  const services = health?.pipelines || [];
  const serviceHealth = snapshot?.services || [];

  return (
    <>
      <SEO title="Vitana DEV — Canary Deployments" description="Canary deployment status and traffic splitting" canonical={window.location.href} />
      <SubNavigation items={devPipelinesNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Canary Deployments" description="Canary deployment status and traffic splitting" emoji="🐤" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search canaries…" onSearch={(q) => console.log('Search:', q)} />
            <UniversalCalendarButton />
            <Button size="sm"><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Active Canaries" value={services.filter(s => s.status === "pending").length} icon={Bird} />
            <DevMetricsCard title="Services" value={services.length} icon={Activity} />
            <DevMetricsCard title="Health Checks" value={serviceHealth.length} icon={Shield} variant="success" />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="status">Canary Status</SplitBarTrigger>
              <SplitBarTrigger value="traffic">Traffic Split</SplitBarTrigger>
              <SplitBarTrigger value="health">Health Comparison</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="status" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Canary Deployments</CardTitle><CardDescription>Current canary revision status per service</CardDescription></CardHeader>
                <CardContent>
                  {services.length > 0 ? (
                    <div className="space-y-3">
                      {services.map(svc => (
                        <div key={svc.service} className="flex items-center justify-between p-4 rounded-lg border">
                          <div>
                            <span className="font-medium text-sm">{svc.service}</span>
                            <p className="text-xs text-muted-foreground">SHA: {svc.git_sha.substring(0, 8)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={svc.status === "passing" ? "bg-green-100 text-green-800" : svc.status === "failing" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>{svc.status}</Badge>
                            <Badge variant="outline" className="text-xs">100% traffic</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-center py-12 text-muted-foreground">No canary deployments active</div>}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="traffic" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Traffic Distribution</CardTitle><CardDescription>Traffic split between stable and canary revisions</CardDescription></CardHeader>
                <CardContent>
                  {services.length > 0 ? (
                    <div className="space-y-4">
                      {services.map(svc => (
                        <div key={svc.service} className="space-y-2">
                          <span className="font-medium text-sm">{svc.service}</span>
                          <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                            <div className="bg-green-500 flex-1" title="Stable: 100%" />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Stable: 100%</span>
                            <span>Canary: 0%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-center py-12 text-muted-foreground">No traffic data</div>}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="health" className="mt-6">
              <DevStatusGrid
                title="Service Health Comparison"
                description="Health metrics for canary evaluation"
                items={serviceHealth.map(s => ({
                  name: s.name,
                  status: s.status,
                  detail: `Error rate: ${(s.error_rate * 100).toFixed(1)}%`,
                  latency_ms: s.latency_ms,
                }))}
                isLoading={isLoading}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
