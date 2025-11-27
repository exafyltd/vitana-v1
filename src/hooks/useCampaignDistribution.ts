import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QueueRecipientsParams {
  campaignId: string;
  channels: string[];
  audienceData: {
    vitanaContacts?: boolean;
    csvUpload?: File;
    segments?: string[];
  };
  messageContent: {
    subject?: string;
    body: string;
  };
}

interface ProcessQueueParams {
  channel: 'email' | 'sms' | 'whatsapp';
}

export function useCampaignDistribution() {
  const queryClient = useQueryClient();

  // Queue recipients for distribution
  const queueRecipients = useMutation({
    mutationFn: async (params: QueueRecipientsParams) => {
      const { data, error } = await supabase.functions.invoke('queue-campaign-recipients', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-analytics', variables.campaignId] });
      toast.success(`Queued ${data.totalRecipients} recipients across ${data.channels.length} channels`);
    },
    onError: (error: Error) => {
      console.error('Error queuing recipients:', error);
      toast.error(`Failed to queue recipients: ${error.message}`);
    },
  });

  // Process message queue for a specific channel
  const processQueue = useMutation({
    mutationFn: async (params: ProcessQueueParams) => {
      const { data, error } = await supabase.functions.invoke('process-campaign-queue', {
        body: { channel: params.channel },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-analytics'] });
      toast.success(`Processed ${data.sent} messages on ${data.channel}`);
    },
    onError: (error: Error) => {
      console.error('Error processing queue:', error);
      toast.error(`Failed to process queue: ${error.message}`);
    },
  });

  // Start full campaign distribution (queue + trigger processing)
  const startDistribution = useMutation({
    mutationFn: async (params: QueueRecipientsParams) => {
      // First queue all recipients
      const queueResult = await supabase.functions.invoke('queue-campaign-recipients', {
        body: params,
      });

      if (queueResult.error) throw queueResult.error;

      // Then trigger processing for each channel
      const processingPromises = params.channels.map((channel) =>
        supabase.functions.invoke('process-campaign-queue', {
          body: { channel },
        })
      );

      await Promise.all(processingPromises);

      return queueResult.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-analytics', variables.campaignId] });
      toast.success(`Distribution started for ${data.totalRecipients} recipients`);
    },
    onError: (error: Error) => {
      console.error('Error starting distribution:', error);
      toast.error(`Failed to start distribution: ${error.message}`);
    },
  });

  return {
    queueRecipients: queueRecipients.mutate,
    processQueue: processQueue.mutate,
    startDistribution: startDistribution.mutate,
    isQueueing: queueRecipients.isPending,
    isProcessing: processQueue.isPending,
    isDistributing: startDistribution.isPending,
  };
}
