import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifySuccess } from '@/lib/i18n-toast';

export type CampaignRecipient = {
  id: string;
  campaign_id: string;
  recipient_type: 'contact' | 'segment' | 'csv';
  recipient_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_name: string;
  channel: string;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  failed_at?: string;
  unsubscribed_at?: string;
  error_message?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
};

export function useCampaignRecipients(campaignId?: string) {
  const queryClient = useQueryClient();

  const { data: recipients, isLoading } = useQuery({
    queryKey: ["campaign_recipients", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from("campaign_recipients")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CampaignRecipient[];
    },
    enabled: !!campaignId,
  });

  const addRecipients = useMutation({
    mutationFn: async (recipientsData: Omit<CampaignRecipient, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from("campaign_recipients")
        .insert(recipientsData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_recipients"] });
      notifySuccess('toasts.hooks.recipientsAddedCampaign');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add recipients: ${error.message}`);
    },
  });

  const getRecipientStats = () => {
    if (!recipients) return null;
    
    return {
      total: recipients.length,
      pending: recipients.filter(r => r.status === 'pending').length,
      sent: recipients.filter(r => r.status === 'sent').length,
      delivered: recipients.filter(r => r.status === 'delivered').length,
      opened: recipients.filter(r => r.status === 'opened').length,
      clicked: recipients.filter(r => r.status === 'clicked').length,
      failed: recipients.filter(r => r.status === 'failed').length,
      unsubscribed: recipients.filter(r => r.status === 'unsubscribed').length,
    };
  };

  return {
    recipients,
    isLoading,
    addRecipients,
    getRecipientStats,
  };
}
