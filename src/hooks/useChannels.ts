import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { notifySuccess } from '@/lib/i18n-toast';

export type DistributionChannel = Database["public"]["Tables"]["distribution_channels"]["Row"];
export type DistributionChannelInsert = Database["public"]["Tables"]["distribution_channels"]["Insert"];

export function useChannels() {
  const queryClient = useQueryClient();

  const { data: channels, isLoading } = useQuery({
    queryKey: ["distribution_channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_channels")
        .select("*")
        .order("channel_name", { ascending: true });

      if (error) throw error;
      return data as DistributionChannel[];
    },
  });

  const connectedChannels = channels?.filter(c => c.is_connected) || [];
  const availableChannels = channels?.filter(c => !c.is_connected) || [];

  const connectChannel = useMutation({
    mutationFn: async (channelData: DistributionChannelInsert) => {
      const { data, error } = await supabase
        .from("distribution_channels")
        .insert(channelData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_channels"] });
      notifySuccess('toasts.hooks.channelConnectedSuccessfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect channel: ${error.message}`);
    },
  });

  const disconnectChannel = useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from("distribution_channels")
        .update({ is_connected: false })
        .eq("id", channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_channels"] });
      notifySuccess('toasts.hooks.channelDisconnected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });

  const toggleChannel = useMutation({
    mutationFn: async ({
      channelId,
      isActive,
    }: {
      channelId: string;
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from("distribution_channels")
        .update({ is_active: isActive })
        .eq("id", channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_channels"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle channel: ${error.message}`);
    },
  });

  return {
    channels,
    connectedChannels,
    availableChannels,
    isLoading,
    connectChannel,
    disconnectChannel,
    toggleChannel,
  };
}
