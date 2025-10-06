import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PostAnalytics = Database["public"]["Tables"]["post_analytics"]["Row"];

export function usePostAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["post_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_analytics")
        .select("*, distribution_posts(title)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate aggregated metrics
  const metrics = analytics?.reduce(
    (acc, item) => ({
      totalSent: acc.totalSent + (item.sent_count || 0),
      totalDelivered: acc.totalDelivered + (item.delivered_count || 0),
      totalOpened: acc.totalOpened + (item.opened_count || 0),
      totalClicked: acc.totalClicked + (item.clicked_count || 0),
      totalResponded: acc.totalResponded + (item.responded_count || 0),
      totalFailed: acc.totalFailed + (item.failed_count || 0),
      totalRevenue: acc.totalRevenue + Number(item.revenue || 0),
    }),
    {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalResponded: 0,
      totalFailed: 0,
      totalRevenue: 0,
    }
  );

  // Group by channel
  const channelMetrics = analytics?.reduce((acc, item) => {
    const channel = item.channel_type;
    if (!acc[channel]) {
      acc[channel] = {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        responded: 0,
        failed: 0,
        revenue: 0,
      };
    }
    acc[channel].sent += item.sent_count || 0;
    acc[channel].delivered += item.delivered_count || 0;
    acc[channel].opened += item.opened_count || 0;
    acc[channel].clicked += item.clicked_count || 0;
    acc[channel].responded += item.responded_count || 0;
    acc[channel].failed += item.failed_count || 0;
    acc[channel].revenue += Number(item.revenue || 0);
    return acc;
  }, {} as Record<string, any>);

  return {
    analytics,
    metrics,
    channelMetrics,
    isLoading,
  };
}
