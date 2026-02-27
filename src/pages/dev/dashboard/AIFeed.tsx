import { useState } from "react";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEventStream } from "@/components/dev/DevEventStream";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Filter, Brain, Zap, Lightbulb } from "lucide-react";
import { devDashboardNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { useLLMMetrics } from "@/hooks/dev/useLLMMetrics";
import { AutopilotRecommendation } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

export default function DashboardAIFeed() {
  const [activeTab, setActiveTab] = useState("feed");
  const { events: smartEvents, error, available, isLoading, refetch } = useOasisEvents({ smart: true, limit: 50 });
  const { telemetry } = useLLMMetrics();

  return (
    <>
      <SEO title="Vitana DEV — AI Activity Feed" description="AI decisions and autopilot activity" canonical={window.location.href} />
      <SubNavigation items={devDashboardNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="AI Activity Feed" description="AI decisions and autopilot activity" emoji="🤖" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search AI events…" onSearch={(q) => console.log('Search:', q)} />
            <Button size="sm" onClick={() => refetch()}><Filter className="w-4 h-4 mr-2" />Refresh</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="AI Events" value={smartEvents.length} icon={Brain} />
            <DevMetricsCard title="LLM Calls" value={telemetry?.total_calls ?? "—"} icon={Zap} />
            <DevMetricsCard title="AI Cost" value={telemetry ? `$${telemetry.total_cost_usd.toFixed(2)}` : "—"} icon={Lightbulb} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="feed">Live AI Feed</SplitBarTrigger>
              <SplitBarTrigger value="decisions">AI Decisions</SplitBarTrigger>
              <SplitBarTrigger value="models">Model Usage</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="feed" className="mt-6">
              <DevEventStream
                title="AI Activity Stream"
                description="Smart-filtered events showing AI decisions and autonomous actions"
                events={smartEvents.map(e => ({ ...e, id: e.id }))}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                emptyMessage="No AI activity recorded"
              />
            </SplitBarContent>

            <SplitBarContent value="decisions" className="mt-6">
              <DevDataTable
                title="AI Decision Log"
                description="Detailed log of AI-powered decisions"
                columns={[
                  { key: "created_at", label: "Time", sortable: true, render: (row: Record<string, unknown>) => <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(row.created_at as string), { addSuffix: true })}</span> },
                  { key: "type", label: "Type", sortable: true, render: (row: Record<string, unknown>) => <Badge variant="outline" className="text-xs">{row.type as string}</Badge> },
                  { key: "service", label: "Service", sortable: true },
                  { key: "vtid", label: "VTID", render: (row: Record<string, unknown>) => row.vtid ? <Badge variant="secondary" className="text-xs font-mono">{row.vtid as string}</Badge> : <span className="text-muted-foreground">—</span> },
                  { key: "message", label: "Decision", className: "max-w-[300px]", render: (row: Record<string, unknown>) => <span className="text-sm truncate block">{row.message as string}</span> },
                ]}
                data={smartEvents.map(e => ({ ...e } as Record<string, unknown>))}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter AI decisions…"
                searchKeys={["type", "service", "vtid", "message"]}
                emptyMessage="No AI decisions logged"
              />
            </SplitBarContent>

            <SplitBarContent value="models" className="mt-6">
              <DevDataTable
                title="Model Usage"
                description="LLM provider and model usage breakdown"
                columns={[
                  { key: "provider", label: "Provider", sortable: true, render: (row: Record<string, unknown>) => <span className="font-medium text-sm">{row.provider as string}</span> },
                  { key: "model", label: "Model", sortable: true, render: (row: Record<string, unknown>) => <Badge variant="outline" className="text-xs">{row.model as string}</Badge> },
                  { key: "calls", label: "Calls", sortable: true },
                  { key: "tokens", label: "Tokens", sortable: true, render: (row: Record<string, unknown>) => <span>{(row.tokens as number).toLocaleString()}</span> },
                  { key: "cost_usd", label: "Cost", sortable: true, render: (row: Record<string, unknown>) => <span className="font-mono">${(row.cost_usd as number).toFixed(4)}</span> },
                ]}
                data={(telemetry?.by_provider || []).map(p => ({ ...p } as Record<string, unknown>))}
                isLoading={false}
                error={null}
                available={true}
                searchable
                searchPlaceholder="Filter models…"
                searchKeys={["provider", "model"]}
                emptyMessage="No model usage data"
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
