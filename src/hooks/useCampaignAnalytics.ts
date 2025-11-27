import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface CampaignChannelMetrics {
  channel: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
}

export interface CampaignAnalytics {
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  totalUnsubscribed: number;
  channels: CampaignChannelMetrics[];
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export function useCampaignAnalytics(campaignId: string) {
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: async () => {
      // Fetch per-channel metrics
      const { data: channelData, error: channelError } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId);

      if (channelError) throw channelError;

      // Aggregate by channel
      const channelMetrics: Record<string, CampaignChannelMetrics> = {};
      
      channelData?.forEach((recipient) => {
        const channel = recipient.channel;
        if (!channelMetrics[channel]) {
          channelMetrics[channel] = {
            channel,
            total: 0,
            sent: 0,
            delivered: 0,
            failed: 0,
            opened: 0,
            clicked: 0,
            unsubscribed: 0,
          };
        }

        const metrics = channelMetrics[channel];
        metrics.total++;
        
        if (recipient.sent_at) metrics.sent++;
        if (recipient.delivered_at) metrics.delivered++;
        if (recipient.failed_at) metrics.failed++;
        if (recipient.opened_at) metrics.opened++;
        if (recipient.clicked_at) metrics.clicked++;
        if (recipient.unsubscribed_at) metrics.unsubscribed++;
      });

      const channels = Object.values(channelMetrics);

      // Calculate totals
      const totalRecipients = channelData?.length || 0;
      const totalSent = channels.reduce((sum, c) => sum + c.sent, 0);
      const totalDelivered = channels.reduce((sum, c) => sum + c.delivered, 0);
      const totalFailed = channels.reduce((sum, c) => sum + c.failed, 0);
      const totalOpened = channels.reduce((sum, c) => sum + c.opened, 0);
      const totalClicked = channels.reduce((sum, c) => sum + c.clicked, 0);
      const totalUnsubscribed = channels.reduce((sum, c) => sum + c.unsubscribed, 0);

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

      return {
        totalRecipients,
        totalSent,
        totalDelivered,
        totalFailed,
        totalOpened,
        totalClicked,
        totalUnsubscribed,
        channels,
        deliveryRate,
        openRate,
        clickRate,
      } as CampaignAnalytics;
    },
    enabled: !!campaignId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`campaign-recipients-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_recipients',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, refetch]);

  return {
    analytics,
    isLoading,
    refetch,
  };
}
