import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Download, DollarSign, Cpu, Zap, BarChart3 } from "lucide-react";
import { devObservabilityNavigation } from "@/config/dev-navigation";
import { useLLMMetrics } from "@/hooks/dev/useLLMMetrics";
import { SoftWarningBanner } from "@/components/dev/SoftWarningBanner";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4"];

interface ProviderRecord extends Record<string, unknown> {
  provider: string;
  model: string;
  calls: number;
  tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
}

const providerColumns: DevDataColumn<ProviderRecord>[] = [
  { key: "provider", label: "Provider", sortable: true, render: (row) => <span className="font-medium text-sm">{row.provider}</span> },
  { key: "model", label: "Model", sortable: true, render: (row) => <Badge variant="outline" className="text-xs">{row.model}</Badge> },
  { key: "calls", label: "Calls", sortable: true },
  { key: "tokens", label: "Tokens", sortable: true, render: (row) => <span className="text-sm">{(row.tokens as number).toLocaleString()}</span> },
  { key: "cost_usd", label: "Cost", sortable: true, render: (row) => <span className="text-sm font-mono">${(row.cost_usd as number).toFixed(4)}</span> },
  { key: "avg_latency_ms", label: "Avg Latency", sortable: true, render: (row) => <span className="text-xs font-mono">{row.avg_latency_ms}ms</span> },
];

export default function ObservabilityCosts() {
  const [activeTab, setActiveTab] = useState("overview");
  const { telemetry, policy, error, available, isLoading, refetch } = useLLMMetrics();

  const providers = (telemetry?.by_provider || []).map(p => ({ ...p } as ProviderRecord));
  const costPieData = providers.map(p => ({ name: `${p.provider}/${p.model}`, value: p.cost_usd as number }));

  return (
    <>
      <SEO title="Vitana DEV — Cost Analysis" description="LLM and API cost analysis" canonical={window.location.href} />
      <SubNavigation items={devObservabilityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Cost Analysis" description="LLM and API cost analysis" emoji="💰" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search costs…" onSearch={(q) => console.log('Search:', q)} />
            <Button size="sm" onClick={() => refetch()}><Download className="w-4 h-4 mr-2" />Export Report</Button>
          </UtilityActionButton>

          {!available && error && <SoftWarningBanner message={`Gateway not reachable — ${error.message || "read-only stub active"}`} />}

          <DevMetricsGrid columns={4}>
            <DevMetricsCard title="Total Cost" value={telemetry ? `$${telemetry.total_cost_usd.toFixed(2)}` : "—"} icon={DollarSign} />
            <DevMetricsCard title="Total Calls" value={telemetry?.total_calls ?? "—"} icon={Zap} />
            <DevMetricsCard title="Total Tokens" value={telemetry ? telemetry.total_tokens.toLocaleString() : "—"} icon={Cpu} />
            <DevMetricsCard title="Providers" value={providers.length} icon={BarChart3} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="overview">Cost Overview</SplitBarTrigger>
              <SplitBarTrigger value="breakdown">Provider Breakdown</SplitBarTrigger>
              <SplitBarTrigger value="routing">Routing Policy</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Cost by Provider</CardTitle><CardDescription>LLM cost distribution</CardDescription></CardHeader>
                  <CardContent>
                    {costPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={costPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: $${value.toFixed(4)}`}>
                            {costPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="text-center py-12 text-muted-foreground">No cost data</div>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">Calls by Provider</CardTitle><CardDescription>API call volume distribution</CardDescription></CardHeader>
                  <CardContent>
                    {providers.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={providers}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="calls" fill="#3b82f6" name="Calls" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="text-center py-12 text-muted-foreground">No call data</div>}
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>

            <SplitBarContent value="breakdown" className="mt-6">
              <DevDataTable title="Provider Breakdown" description="Cost and usage per LLM provider and model" columns={providerColumns} data={providers} isLoading={isLoading} error={error} available={available} onRefresh={refetch} searchable searchPlaceholder="Filter by provider, model…" searchKeys={["provider", "model"]} emptyMessage="No LLM usage data" />
            </SplitBarContent>

            <SplitBarContent value="routing" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">LLM Routing Policy</CardTitle><CardDescription>Model routing rules and defaults</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {policy ? (
                    <>
                      <div className="p-3 rounded-lg border bg-muted/50">
                        <p className="text-sm text-muted-foreground">Default Provider</p>
                        <p className="font-medium">{policy.default_provider} / {policy.default_model}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Routing Rules</p>
                        {policy.rules.map((rule, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                            <Badge variant="outline" className="text-xs">{rule.task_type}</Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{rule.provider}/{rule.model}</span>
                              <Badge variant="secondary" className="text-xs">Priority {rule.priority}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <div className="text-center py-12 text-muted-foreground">No routing policy data available</div>}
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
