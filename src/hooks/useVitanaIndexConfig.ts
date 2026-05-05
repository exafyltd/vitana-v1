import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export interface VitanaIndexConfig {
  id: string;
  algorithm_weights: {
    sleep: number;
    exercise: number;
    nutrition: number;
    mental_wellness: number;
    social_connection: number;
    hydration: number;
  };
  scoring_tiers: Array<{
    min: number;
    max: number;
    label: string;
    color: string;
    icon: string;
  }>;
  display_preferences: {
    show_score_in_header: boolean;
    show_trend_indicator: boolean;
    show_breakdown_details: boolean;
    default_score_range: [number, number];
    enable_color_coding: boolean;
  };
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useVitanaIndexConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["vitana_index_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitana_index_config")
        .select("*")
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as VitanaIndexConfig;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<VitanaIndexConfig>) => {
      if (!config) throw new Error("No active config found");

      const { data, error } = await supabase
        .from("vitana_index_config")
        .update(updates)
        .eq("id", config.id)
        .select()
        .single();

      if (error) throw error;
      return data as VitanaIndexConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vitana_index_config"] });
      notify('toasts.hooks.vitanaIndexConfigUpdated', 'toasts.hooks.systemConfigurationHasSavedSuccessfully');
    },
    onError: (error) => {
      notifyError('toasts.hooks.errorUpdatingConfig');
    },
  });

  return {
    config,
    isLoading,
    error,
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  };
}
