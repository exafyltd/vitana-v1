import { useState } from "react";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevStatusGrid } from "@/components/dev/DevStatusGrid";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Filter, Activity, Gauge, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { devDashboardNavigation } from "@/config/dev-navigation";
import { useTelemetry } from "@/hooks/dev/useTelemetry";
import { useCICDStatus } from "@/hooks/dev/useCICDStatus";
import { SoftWarningBanner } from "@/components/dev/SoftWarningBanner";

export default function DashboardSystemHealth() {
  const [activeTab, setActiveTab] = useState("overview");
  const { snapshot, error, available, isLoading, refetch } = useTelemetry();
  const { health: cicdHealth } = useCICDStatus();

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  return (
    <>
      <SEO title="Vitana DEV — System Health" description="System health overview and service status" canonical={window.location.href} />
      <SubNavigation items={devDashboardNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="System Health" description="System health overview and service status" emoji="💚" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search health…" onSearch={(q) => console.log('Search:', q)} />
            <Button size="sm" onClick={() => refetch()}><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          {!available && error && <SoftWarningBanner message={`Gateway not reachable — ${error.message || "read-only stub active"}`} />}

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="overview">Health Overview</SplitBarTrigger>
              <SplitBarTrigger value="services">Service Details</SplitBarTrigger>
              <SplitBarTrigger value="pipelines">Pipeline Health</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="overview" className="mt-6">
              {isLoading && !snapshot ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="space-y-6">
                  <DevMetricsGrid columns={4}>
                    <DevMetricsCard title="Request Rate" value={snapshot ? `${snapshot.request_rate}/s` : "—"} icon={Activity} />
                    <DevMetricsCard title="Error Rate" value={snapshot ? `${(snapshot.error_rate * 100).toFixed(2)}%` : "—"} icon={AlertTriangle} variant={snapshot && snapshot.error_rate > 0.05 ? "danger" : "success"} />
                    <DevMetricsCard title="Uptime" value={snapshot ? formatUptime(snapshot.uptime_seconds) : "—"} icon={Clock} variant="success" />
                    <DevMetricsCard title="P95 Latency" value={snapshot ? `${snapshot.latency_p95}ms` : "—"} icon={Gauge} variant={snapshot && snapshot.latency_p95 > 500 ? "warning" : "success"} />
                  </DevMetricsGrid>

                  <DevStatusGrid
                    title="Service Health"
                    description="Real-time service status"
                    items={(snapshot?.services || []).map(s => ({
                      name: s.name,
                      status: s.status,
                      detail: `Error rate: ${(s.error_rate * 100).toFixed(1)}%`,
                      latency_ms: s.latency_ms,
                    }))}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </SplitBarContent>

            <SplitBarContent value="services" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Service Detail</CardTitle><CardDescription>Individual service metrics</CardDescription></CardHeader>
                <CardContent>
                  {(snapshot?.services || []).length > 0 ? (
                    <div className="space-y-4">
                      {snapshot!.services.map(s => (
                        <div key={s.name} className="p-4 rounded-lg border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{s.name}</span>
                            <span className={`text-xs font-medium ${s.status === "healthy" ? "text-green-600" : s.status === "degraded" ? "text-yellow-600" : "text-red-600"}`}>{s.status}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>Latency: {s.latency_ms}ms</div>
                            <div>Error rate: {(s.error_rate * 100).toFixed(2)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-center py-12 text-muted-foreground">No service data</div>}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="pipelines" className="mt-6">
              <DevStatusGrid
                title="CI/CD Pipeline Health"
                description="Current pipeline status"
                items={(cicdHealth?.pipelines || []).map(p => ({
                  name: p.service,
                  status: p.status === "passing" ? "healthy" as const : p.status === "failing" ? "down" as const : "degraded" as const,
                  detail: `SHA: ${p.git_sha.substring(0, 8)} — ${(p.duration_ms / 1000).toFixed(1)}s`,
                }))}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
