import { useState, useEffect, useMemo } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { LiveEventsPanel } from "@/components/dev/LiveEventsPanel";
import { VTIDSnapshotPanel } from "@/components/dev/VTIDSnapshotPanel";
import { CommandConsolePanel } from "@/components/dev/CommandConsolePanel";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevStatusGrid } from "@/components/dev/DevStatusGrid";
import { DevEventStream } from "@/components/dev/DevEventStream";
import { DevDataTable } from "@/components/dev/DevDataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Activity, Bell, Heart, Plus, Brain, Zap, AlertCircle, AlertTriangle, Gauge, Clock } from "lucide-react";
import { devDashboardNavigation } from "@/config/dev-navigation";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { useLLMMetrics } from "@/hooks/dev/useLLMMetrics";
import { useTelemetry } from "@/hooks/dev/useTelemetry";
import { useCICDStatus } from "@/hooks/dev/useCICDStatus";
import { OasisEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

export default function DevDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);
  const [tenantFilter, setTenantFilter] = useState(() => {
    return localStorage.getItem('dev_dashboard_tenant') || 'system';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('dev_dashboard_status') || 'all';
  });

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('dev_dashboard_tenant', tenantFilter);
  }, [tenantFilter]);

  useEffect(() => {
    localStorage.setItem('dev_dashboard_status', statusFilter);
  }, [statusFilter]);

  const tenants = ['All', 'System', 'Maxina', 'Earthlinks', 'AlKalma'];
  const statuses = ['All', 'Green', 'Blue', 'Yellow', 'Red'];

  // AI Feed data
  const { events: smartEvents, error: aiError, available: aiAvailable, isLoading: aiLoading, refetch: aiRefetch } = useOasisEvents({ smart: true, limit: 30 });
  const { telemetry: llmTelemetry } = useLLMMetrics();

  // Alerts data
  const { events: redEvents, error: redError, available: redAvailable, isLoading: redLoading, refetch: redRefetch } = useOasisEvents({ status: "red", limit: 20 });
  const { events: yellowEvents, error: yellowError, available: yellowAvailable, isLoading: yellowLoading, refetch: yellowRefetch } = useOasisEvents({ status: "yellow", limit: 20 });
  const allAlerts = useMemo(() => {
    const combined = [...redEvents, ...yellowEvents];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  }, [redEvents, yellowEvents]);

  // System Health data
  const { snapshot, error: healthError, available: healthAvailable, isLoading: healthLoading, refetch: healthRefetch } = useTelemetry();
  const { health: cicdHealth } = useCICDStatus();

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  return (
    <>
      <SEO 
        title="Vitana DEV — Dashboard" 
        description="Command hub dashboard for Vitana platform operations"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation for Dashboard category */}
      <SubNavigation items={devDashboardNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="VITANA DEV Command Hub"
            description="Real-time event monitoring, VTID management, and system control"
            emoji="⚙️"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton 
              placeholder="Search events, VTIDs, commands…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Action
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar (sub-tabs) */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="overview">📊 Overview</SplitBarTrigger>
              <SplitBarTrigger value="ai-feed">🤖 AI Feed</SplitBarTrigger>
              <SplitBarTrigger value="alerts">🔔 Alerts</SplitBarTrigger>
              <SplitBarTrigger value="health">💚 System Health</SplitBarTrigger>
            </SplitBarList>

            {/* Overview Tab Content */}
            <SplitBarContent value="overview" className="mt-6">
              {/* Filters: Tenant & Status */}
              <div className="flex flex-col md:flex-row md:flex-wrap gap-4 items-start md:items-center mb-6">
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  <span className="text-sm font-medium whitespace-nowrap">Tenant:</span>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
                    {tenants.map((tenant) => (
                      <Button
                        key={tenant}
                        variant={tenantFilter === tenant.toLowerCase() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTenantFilter(tenant.toLowerCase())}
                        className="min-h-[44px] md:min-h-0 whitespace-nowrap"
                      >
                        {tenant}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  <span className="text-sm font-medium whitespace-nowrap">Status:</span>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
                    {statuses.map((status) => (
                      <Button
                        key={status}
                        variant={statusFilter === status.toLowerCase() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(status.toLowerCase())}
                        className="min-h-[44px] md:min-h-0 whitespace-nowrap"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dashboard Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                  <LiveEventsPanel 
                    tenant={tenantFilter === 'all' ? 'system' : tenantFilter}
                    status={statusFilter as 'all' | 'green' | 'blue' | 'yellow' | 'red'}
                  />
                  <VTIDSnapshotPanel />
                </div>
                
                <div>
                  <CommandConsolePanel />
                </div>
              </div>
            </SplitBarContent>

            {/* AI Feed Tab Content */}
            <SplitBarContent value="ai-feed" className="mt-6">
              <div className="space-y-6">
                <DevMetricsGrid columns={3}>
                  <DevMetricsCard title="AI Events" value={smartEvents.length} icon={Brain} />
                  <DevMetricsCard title="LLM Calls" value={llmTelemetry?.total_calls ?? "—"} icon={Zap} />
                  <DevMetricsCard title="AI Cost" value={llmTelemetry ? `$${llmTelemetry.total_cost_usd.toFixed(2)}` : "—"} icon={Activity} />
                </DevMetricsGrid>
                <DevEventStream
                  title="AI Activity Stream"
                  description="Smart-filtered events showing AI decisions and autonomous actions"
                  events={smartEvents.map(e => ({ ...e, id: e.id }))}
                  isLoading={aiLoading}
                  error={aiError}
                  available={aiAvailable}
                  onRefresh={aiRefetch}
                  emptyMessage="No AI activity recorded"
                />
              </div>
            </SplitBarContent>

            {/* Alerts Tab Content */}
            <SplitBarContent value="alerts" className="mt-6">
              <div className="space-y-6">
                <DevMetricsGrid columns={3}>
                  <DevMetricsCard title="Total Alerts" value={allAlerts.length} icon={Bell} variant={allAlerts.length > 0 ? "warning" : "default"} />
                  <DevMetricsCard title="Critical" value={redEvents.length} icon={AlertCircle} variant={redEvents.length > 0 ? "danger" : "success"} />
                  <DevMetricsCard title="Warnings" value={yellowEvents.length} icon={AlertTriangle} variant={yellowEvents.length > 0 ? "warning" : "success"} />
                </DevMetricsGrid>
                <DevDataTable
                  title="Active Alerts"
                  description="Critical and warning alerts requiring attention"
                  columns={[
                    { key: "created_at", label: "Time", sortable: true, render: (row: OasisEvent & Record<string, unknown>) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</span> },
                    { key: "status", label: "Severity", sortable: true, render: (row: OasisEvent & Record<string, unknown>) => <Badge className={`text-xs ${row.status === "red" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{row.status === "red" ? "Critical" : "Warning"}</Badge> },
                    { key: "service", label: "Source", sortable: true, render: (row: OasisEvent & Record<string, unknown>) => <span className="font-medium text-sm">{row.service}</span> },
                    { key: "message", label: "Message", className: "max-w-[400px]", render: (row: OasisEvent & Record<string, unknown>) => <span className="text-sm truncate block">{row.message}</span> },
                  ]}
                  data={allAlerts.map(e => ({ ...e } as OasisEvent & Record<string, unknown>))}
                  isLoading={redLoading || yellowLoading}
                  error={redError || yellowError}
                  available={redAvailable || yellowAvailable}
                  onRefresh={() => { redRefetch(); yellowRefetch(); }}
                  searchable
                  searchPlaceholder="Filter alerts…"
                  searchKeys={["service", "message", "status"]}
                  emptyMessage="No active alerts — system healthy"
                />
              </div>
            </SplitBarContent>

            {/* System Health Tab Content */}
            <SplitBarContent value="health" className="mt-6">
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
                  isLoading={healthLoading}
                />
                <DevStatusGrid
                  title="CI/CD Pipeline Health"
                  description="Current pipeline status"
                  items={(cicdHealth?.pipelines || []).map(p => ({
                    name: p.service,
                    status: p.status === "passing" ? "healthy" as const : p.status === "failing" ? "down" as const : "degraded" as const,
                    detail: `SHA: ${p.git_sha.substring(0, 8)}`,
                  }))}
                />
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <RestoreSessionModal 
        open={restoreSessionOpen} 
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
