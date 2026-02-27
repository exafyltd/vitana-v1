import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevStatusGrid } from "@/components/dev/DevStatusGrid";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Filter, Activity, Gauge, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { devObservabilityNavigation } from "@/config/dev-navigation";
import { useTelemetry } from "@/hooks/dev/useTelemetry";
import { SoftWarningBanner } from "@/components/dev/SoftWarningBanner";

export default function ObservabilityMetrics() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { snapshot, error, available, isLoading, refetch } = useTelemetry();

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  return (
    <>
      <SEO title="Vitana DEV — System Metrics" description="System-wide telemetry and performance metrics" canonical={window.location.href} />
      <SubNavigation items={devObservabilityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="System Metrics" description="System-wide telemetry and performance metrics" emoji="📈" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search metrics…" onSearch={(q) => console.log('Search:', q)} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          {!available && error && <SoftWarningBanner message={`Gateway not reachable — ${error.message || "read-only stub active"}`} />}

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="dashboard">Metrics Dashboard</SplitBarTrigger>
              <SplitBarTrigger value="latency">Latency Details</SplitBarTrigger>
              <SplitBarTrigger value="services">Service Health</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="dashboard" className="mt-6">
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

                  <DevMetricsGrid columns={3}>
                    <DevMetricsCard title="P50 Latency" value={snapshot ? `${snapshot.latency_p50}ms` : "—"} subtitle="Median response time" />
                    <DevMetricsCard title="P95 Latency" value={snapshot ? `${snapshot.latency_p95}ms` : "—"} subtitle="95th percentile" />
                    <DevMetricsCard title="P99 Latency" value={snapshot ? `${snapshot.latency_p99}ms` : "—"} subtitle="99th percentile" />
                  </DevMetricsGrid>
                </div>
              )}
            </SplitBarContent>

            <SplitBarContent value="latency" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Latency Percentiles</CardTitle><CardDescription>Response time distribution across all services</CardDescription></CardHeader>
                <CardContent>
                  {snapshot ? (
                    <div className="space-y-4">
                      {[
                        { label: "P50 (Median)", value: snapshot.latency_p50, max: snapshot.latency_p99 },
                        { label: "P95", value: snapshot.latency_p95, max: snapshot.latency_p99 },
                        { label: "P99", value: snapshot.latency_p99, max: snapshot.latency_p99 },
                      ].map(item => {
                        const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-sm"><span className="font-medium">{item.label}</span><span className="text-muted-foreground">{item.value}ms</span></div>
                            <div className="w-full bg-muted rounded-full h-3"><div className={`h-3 rounded-full ${item.value > 500 ? "bg-red-500" : item.value > 200 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="text-center py-12 text-muted-foreground">No latency data available</div>}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="services" className="mt-6">
              <DevStatusGrid
                title="Service Health"
                description="Real-time health status of all platform services"
                items={(snapshot?.services || []).map(s => ({
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
