import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Send, 
  CheckCircle, 
  Eye, 
  MousePointer, 
  MessageCircle,
  DollarSign,
  Loader2
} from "lucide-react";
import { usePostAnalytics } from "@/hooks/usePostAnalytics";
import { t } from '@/lib/i18n-toast';

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export function AnalyticsDashboard() {
  const { metrics, channelMetrics, isLoading } = usePostAnalytics();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics || !channelMetrics) {
    return (
      <Card>
        <CardContent className="flex flex-col justify-center items-center h-64">
          <TrendingUp className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">{t('screens.sharing.noAnalyticsDataYet')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('screens.sharing.startBlastingPostsSeeYourPerformance')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: "Sent", value: metrics.totalSent, icon: Send, color: "text-blue-600" },
    { label: "Delivered", value: metrics.totalDelivered, icon: CheckCircle, color: "text-green-600" },
    { label: "Opened", value: metrics.totalOpened, icon: Eye, color: "text-purple-600" },
    { label: "Clicked", value: metrics.totalClicked, icon: MousePointer, color: "text-orange-600" },
    { label: "Responded", value: metrics.totalResponded, icon: MessageCircle, color: "text-cyan-600" },
    { label: "Revenue", value: `$${metrics.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600" },
  ];

  const channelData = Object.entries(channelMetrics).map(([channel, data]: [string, any]) => ({
    name: channel,
    sent: data.sent,
    delivered: data.delivered,
    opened: data.opened,
  }));

  const pieData = Object.entries(channelMetrics).map(([channel, data]: [string, any]) => ({
    name: channel,
    value: data.sent,
  }));

  const deliveryRate = metrics.totalSent > 0 
    ? ((metrics.totalDelivered / metrics.totalSent) * 100).toFixed(1) 
    : "0";
  const openRate = metrics.totalDelivered > 0 
    ? ((metrics.totalOpened / metrics.totalDelivered) * 100).toFixed(1) 
    : "0";
  const clickRate = metrics.totalOpened > 0 
    ? ((metrics.totalClicked / metrics.totalOpened) * 100).toFixed(1) 
    : "0";

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('screens.sharing.deliveryRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{deliveryRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalDelivered} of {metrics.totalSent} sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('screens.sharing.openRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{openRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalOpened} of {metrics.totalDelivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('screens.sharing.clickRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{clickRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalClicked} of {metrics.totalOpened} opened
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('screens.sharing.channelPerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#8b5cf6" name="Sent" />
                <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
                <Bar dataKey="opened" fill="#06b6d4" name="Opened" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('screens.sharing.distributionByChannel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
