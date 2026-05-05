import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Users, MessageCircle, ThumbsUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { t } from '@/lib/i18n-toast';

export function EngagementAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['proactive-engagement-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proactive_engagement')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const total = data.length;
      const helpful = data.filter(e => e.was_helpful === true).length;
      const notHelpful = data.filter(e => e.was_helpful === false).length;
      const noFeedback = total - helpful - notHelpful;
      const successRate = total > 0 ? (helpful / total) * 100 : 0;

      const last7Days = data.filter(e => {
        const date = new Date(e.created_at);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
      });

      const uniqueUsers = new Set(data.map(e => e.user_id)).size;

      const engagementTypes = data.reduce((acc, e) => {
        acc[e.engagement_type] = (acc[e.engagement_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        helpful,
        notHelpful,
        noFeedback,
        successRate,
        last7Days: last7Days.length,
        uniqueUsers,
        engagementTypes
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.admin.totalEngagements')}</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.last7Days || 0} in the last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.admin.successRate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.successRate.toFixed(1)}%</div>
            <Progress value={analytics?.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.admin.uniqueUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.admin.engagedWithProactiveAssistant')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.admin.helpfulFeedback')}</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.helpful || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.notHelpful || 0} not helpful, {analytics?.noFeedback || 0} no feedback
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('screens.admin.engagementTypes')}</CardTitle>
          <CardDescription>{t('screens.admin.breakdownProactiveEngagementInteractions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.engagementTypes && Object.entries(analytics.engagementTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
