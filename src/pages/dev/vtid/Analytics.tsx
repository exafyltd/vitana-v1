import { useState, useMemo } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Download, Hash, Target, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { devVTIDNavigation } from "@/config/dev-navigation";
import { useVTIDProjection } from "@/hooks/dev/useVTIDLedger";
import { SoftWarningBanner } from "@/components/dev/SoftWarningBanner";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

export default function VTIDAnalytics() {
  const [activeTab, setActiveTab] = useState("usage");
  const { projection, error, available, isLoading, refetch } = useVTIDProjection();

  const statusPieData = useMemo(() => {
    if (!projection?.by_status) return [];
    return Object.entries(projection.by_status).map(([name, value]) => ({ name, value }));
  }, [projection]);

  const specPieData = useMemo(() => {
    if (!projection?.by_spec_status) return [];
    return Object.entries(projection.by_spec_status).map(([name, value]) => ({ name, value }));
  }, [projection]);

  const trendData = projection?.data || [];

  return (
    <>
      <SEO
        title="Vitana DEV — VTID Analytics"
        description="VTID usage statistics and analytics"
        canonical={window.location.href}
      />

      <SubNavigation items={devVTIDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="VTID Analytics"
            description="VTID usage statistics and analytics"
            emoji="📊"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search metrics…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm" onClick={() => refetch()}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </UtilityActionButton>

          {!available && error && (
            <SoftWarningBanner message={`Gateway not reachable — ${error.message || "read-only stub active"}`} />
          )}

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="usage">Usage Metrics</SplitBarTrigger>
              <SplitBarTrigger value="distribution">Distribution Charts</SplitBarTrigger>
              <SplitBarTrigger value="trends">Trend Analysis</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="usage" className="mt-6">
              {isLoading && !projection ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  <DevMetricsGrid columns={4}>
                    <DevMetricsCard
                      title="Total VTIDs"
                      value={projection?.total ?? "—"}
                      icon={Hash}
                    />
                    <DevMetricsCard
                      title="Completion Rate"
                      value={projection ? `${(projection.completion_rate * 100).toFixed(1)}%` : "—"}
                      icon={Target}
                      variant={projection && projection.completion_rate > 0.7 ? "success" : projection && projection.completion_rate > 0.4 ? "warning" : "default"}
                    />
                    <DevMetricsCard
                      title="Recent Velocity"
                      value={projection?.recent_velocity ?? "—"}
                      subtitle="VTIDs completed recently"
                      icon={Zap}
                    />
                    <DevMetricsCard
                      title="Statuses"
                      value={statusPieData.length}
                      subtitle="Distinct status categories"
                      icon={CheckCircle2}
                    />
                  </DevMetricsGrid>

                  {trendData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">VTID Activity Over Time</CardTitle>
                        <CardDescription>Created vs completed VTIDs</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="created" fill="#3b82f6" name="Created" />
                            <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </SplitBarContent>

            <SplitBarContent value="distribution" className="mt-6">
              {isLoading && !projection ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Status Distribution</CardTitle>
                      <CardDescription>VTIDs by current status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {statusPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                              {statusPieData.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">No status data available</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Spec Status Distribution</CardTitle>
                      <CardDescription>VTIDs by spec status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {specPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={specPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                              {specPieData.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">No spec status data available</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </SplitBarContent>

            <SplitBarContent value="trends" className="mt-6">
              {isLoading && !projection ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : trendData.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Completion Trend</CardTitle>
                    <CardDescription>VTID completion rate over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" dot={false} />
                        <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No trend data available yet. Data will appear as VTIDs are created and completed over time.
                  </CardContent>
                </Card>
              )}
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
