import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Zap, Target, Brain, CheckCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { adminAIAssistantNavigation } from "@/config/navigation";
import { useAIAssistantAnalytics } from "@/hooks/useAIAssistantAnalytics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIAssistantAnalytics() {
  const { metrics, timeSeriesData, loading, error } = useAIAssistantAnalytics();

  return (
    <AppLayout>
      <SEO 
        title="Analytics | AI Assistant | Admin" 
        description="Track automation performance and effectiveness" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminAIAssistantNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Analytics & Performance"
            description="Monitor automation effectiveness and user engagement"
            emoji="📈"
          />

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">Error loading analytics: {error}</p>
              </CardContent>
            </Card>
          )}

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AdminStatsCard
              title="Total Conversations"
              value={metrics?.total_conversations || 0}
              subtitle="AI conversations initiated"
              icon={Brain}
              loading={loading}
              variant="default"
            />
            <AdminStatsCard
              title="Active (7d)"
              value={metrics?.active_conversations_7d || 0}
              subtitle="Conversations in last 7 days"
              icon={Activity}
              loading={loading}
              variant="default"
            />
            <AdminStatsCard
              title="Patterns Discovered"
              value={metrics?.total_patterns_discovered || 0}
              subtitle={`${metrics?.patterns_implemented || 0} implemented`}
              icon={Target}
              loading={loading}
              variant="success"
            />
            <AdminStatsCard
              title="Automation Success"
              value={`${metrics?.automations_success_rate || 0}%`}
              subtitle={`${metrics?.total_automations || 0} total executions`}
              icon={CheckCircle}
              loading={loading}
              variant="success"
            />
            <AdminStatsCard
              title="Situation Analyses"
              value={metrics?.total_situation_analyses || 0}
              subtitle="AI-powered insights"
              icon={Zap}
              loading={loading}
              variant="default"
            />
            <AdminStatsCard
              title="Avg Analysis Time"
              value={`${Math.round((metrics?.avg_analysis_duration_ms || 0) / 1000)}s`}
              subtitle="Processing duration"
              icon={TrendingUp}
              loading={loading}
              variant="default"
            />
          </div>

          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>7-Day Activity Trends</CardTitle>
              <CardDescription>Daily breakdown of AI assistant activities</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="conversations" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Conversations"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="patterns" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Patterns"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="automations" 
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={2}
                      name="Automations"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>Key observations and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">Automation Success Rate</p>
                      <p className="text-sm text-muted-foreground">
                        {metrics?.automations_success_rate || 0}% of automations execute successfully. 
                        {(metrics?.automations_success_rate || 0) >= 90 
                          ? " Excellent performance!" 
                          : " Consider reviewing failed executions."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Target className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Pattern Implementation</p>
                      <p className="text-sm text-muted-foreground">
                        {metrics?.patterns_implemented || 0} out of {metrics?.total_patterns_discovered || 0} discovered patterns have been implemented.
                        {(metrics?.total_patterns_discovered || 0) > (metrics?.patterns_implemented || 0) 
                          ? " Review pending patterns for potential improvements." 
                          : " All patterns addressed!"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Zap className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium">Analysis Performance</p>
                      <p className="text-sm text-muted-foreground">
                        Average analysis completes in {Math.round((metrics?.avg_analysis_duration_ms || 0) / 1000)}s.
                        {(metrics?.avg_analysis_duration_ms || 0) < 5000 
                          ? " Fast response times!" 
                          : " Consider optimizing analysis logic."}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
