import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, TrendingUp, TrendingDown, Zap, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { t } from '@/lib/i18n-toast';

interface PerformanceMetrics {
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number; // requests per minute
  activeConnections: number;
  p95Latency: number;
  p99Latency: number;
}

interface TimeSeriesData {
  timestamp: string;
  responseTime: number;
  requests: number;
  errors: number;
}

interface PerformancePanelProps {
  metrics: PerformanceMetrics;
  timeSeriesData: TimeSeriesData[];
  integrationName?: string;
}

export default function PerformancePanel({ metrics, timeSeriesData, integrationName }: PerformancePanelProps) {
  const getHealthColor = (rate: number) => {
    if (rate >= 95) return "text-green-500";
    if (rate >= 85) return "text-yellow-500";
    return "text-red-500";
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 200) return "text-green-500";
    if (ms < 500) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-4">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t('screens.admin.avgResponseTime')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getLatencyColor(metrics.avgResponseTime)}`}>
                {metrics.avgResponseTime}
              </span>
              <span className="text-sm text-muted-foreground">{t('screens.admin.ms')}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              P95: {metrics.p95Latency}ms | P99: {metrics.p99Latency}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t('screens.admin.successRate')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getHealthColor(metrics.successRate)}`}>
                {metrics.successRate.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {metrics.successRate >= 95 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">{t('screens.admin.healthy')}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-red-500">{t('screens.admin.degraded')}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t('screens.admin.throughput')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.throughput}</span>
              <span className="text-sm text-muted-foreground">{t('screens.admin.reqmin')}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              {metrics.activeConnections} active connections
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t('screens.admin.errorRate')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${metrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'}`}>
                {metrics.errorRate.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            {metrics.errorRate > 5 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                <AlertTriangle className="w-3 h-3" />
                {t('screens.admin.aboveThreshold')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Response Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('screens.admin.responseTimeTrend')}</CardTitle>
            <CardDescription>{t('screens.admin.averageResponseTimeOverTime')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="timestamp" 
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="Response Time (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Request Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('screens.admin.requestVolume')}</CardTitle>
            <CardDescription>{t('screens.admin.requestsErrorsOverTime')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="timestamp" 
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Legend />
                <Bar dataKey="requests" fill="hsl(var(--primary))" name="Requests" />
                <Bar dataKey="errors" fill="hsl(var(--destructive))" name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Latency Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('screens.admin.latencyPercentiles')}</CardTitle>
          <CardDescription>{t('screens.admin.responseTimeDistribution')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('screens.admin.p50Median')}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${Math.min((metrics.avgResponseTime / 1000) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{metrics.avgResponseTime}ms</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">P95</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500"
                    style={{ width: `${Math.min((metrics.p95Latency / 1000) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{metrics.p95Latency}ms</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">P99</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500"
                    style={{ width: `${Math.min((metrics.p99Latency / 1000) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{metrics.p99Latency}ms</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
