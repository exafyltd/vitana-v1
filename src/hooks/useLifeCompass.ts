import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export interface LifeCompass {
  id: string;
  user_id: string;
  primary_goal: string;
  ai_summary: string | null;
  category: string;
  alignment_score: number;
  confidence_score: number;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface LifeCompassSubgoal {
  id: string;
  compass_id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export function useLifeCompass() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active life compass
  const { data: compass, isLoading } = useQuery({
    queryKey: ["life-compass"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("life_compass")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LifeCompass | null;
    },
  });

  // Fetch subgoals
  const { data: subgoals } = useQuery({
    queryKey: ["life-compass-subgoals", compass?.id],
    queryFn: async () => {
      if (!compass?.id) return [];

      const { data, error } = await supabase
        .from("life_compass_subgoals")
        .select("*")
        .eq("compass_id", compass.id)
        .eq("status", "active")
        .order("priority", { ascending: false });

      if (error) throw error;
      return data as LifeCompassSubgoal[];
    },
    enabled: !!compass?.id,
  });

  // Create or update life compass
  const updateCompassMutation = useMutation({
    mutationFn: async (goal: { primary_goal: string; category: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Deactivate previous compass
      if (compass) {
        await supabase
          .from("life_compass")
          .update({ is_active: false })
          .eq("id", compass.id);
      }

      // Create new compass
      const { data, error } = await supabase
        .from("life_compass")
        .insert({
          user_id: user.id,
          primary_goal: goal.primary_goal,
          category: goal.category,
          is_active: true,
          version: compass ? compass.version + 1 : 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["life-compass"] });
      notify('toasts.hooks.lifeCompassUpdated', 'toasts.hooks.yourAiGuidanceHasUpdatedAlign');
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedUpdate');
    },
  });

  // Add subgoal
  const addSubgoalMutation = useMutation({
    mutationFn: async (subgoal: { title: string; description?: string; priority: "low" | "medium" | "high" }) => {
      if (!compass) throw new Error("No active life compass");

      const { data, error } = await supabase
        .from("life_compass_subgoals")
        .insert({
          compass_id: compass.id,
          ...subgoal,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["life-compass-subgoals"] });
      notify('toasts.hooks.subgoalAdded', 'toasts.hooks.yourSubgoalHasAddedSuccessfully');
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedAddSubgoal');
    },
  });

  return {
    compass,
    subgoals: subgoals || [],
    isLoading,
    updateCompass: updateCompassMutation.mutate,
    addSubgoal: addSubgoalMutation.mutate,
    isUpdating: updateCompassMutation.isPending,
  };
}
