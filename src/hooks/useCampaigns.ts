import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { notifySuccess } from '@/lib/i18n-toast';

export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];

export function useCampaigns() {
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: CampaignInsert) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert(campaign)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      notifySuccess('toasts.hooks.campaignCreatedSuccessfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      notifySuccess('toasts.hooks.campaignUpdated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    },
  });

  const activateCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      notifySuccess('toasts.hooks.campaignActivated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to activate campaign: ${error.message}`);
    },
  });

  const pauseCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update({ status: "paused" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      notifySuccess('toasts.hooks.campaignPaused');
    },
    onError: (error: Error) => {
      toast.error(`Failed to pause campaign: ${error.message}`);
    },
  });

  const completeCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update({ status: "completed" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      notifySuccess('toasts.hooks.campaignCompletedSuccessfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete campaign: ${error.message}`);
    },
  });

  const duplicateCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      // Fetch the original campaign
      const { data: original, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate with modified name
      const duplicate: CampaignInsert = {
        name: `${original.name} (Copy)`,
        description: original.description,
        status: "draft",
        start_date: original.start_date,
        end_date: original.end_date,
        target_channels: original.target_channels,
        distribution_config: original.distribution_config,
        user_id: original.user_id,
      };

      const { data, error } = await supabase
        .from("campaigns")
        .insert(duplicate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      notifySuccess('toasts.hooks.campaignDuplicatedSuccessfullyNewDraftCreated');
      return data;
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate campaign: ${error.message}`);
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      notifySuccess('toasts.hooks.campaignDeleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    },
  });

  // Start campaign distribution
  const startCampaignDistribution = useMutation({
    mutationFn: async ({ 
      campaignId, 
      mode 
    }: { 
      campaignId: string; 
      mode: 'instant' | 'scheduled' 
    }) => {
      // Update campaign status to distributing
      const { data, error } = await supabase
        .from('campaigns')
        .update({ 
          status: mode === 'instant' ? 'active' : 'scheduled',
          metadata: { distribution_mode: mode, started_at: new Date().toISOString() }
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      notifySuccess('toasts.hooks.campaignDistributionStartedSuccessfully');
    },
    onError: (error: Error) => {
      console.error('Error starting campaign distribution:', error);
      toast.error(`Failed to start distribution: ${error.message}`);
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    activateCampaign,
    pauseCampaign,
    completeCampaign,
    duplicateCampaign,
    deleteCampaign,
    startCampaignDistribution,
  };
}
