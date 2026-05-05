import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export interface Pattern {
  id: string;
  created_by: string;
  pattern_type: string;
  pattern_name: string;
  pattern_description: string;
  confidence_level: number;
  sample_size: number;
  occurrence_rate: number;
  triggers: string[];
  conditions: any[];
  suggested_actions: any[];
  expected_impact: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  implemented_at?: string;
  linked_rule_id?: string;
}

export function usePatternDiscovery(filters?: { type?: string; status?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patterns, isLoading } = useQuery({
    queryKey: ["pattern_discoveries", filters],
    queryFn: async () => {
      let query = supabase
        .from("pattern_discoveries")
        .select("*")
        .order("confidence_level", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.type) {
        query = query.eq("pattern_type", filters.type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Pattern[];
    },
  });

  const runAnalysis = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("analyze-patterns", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pattern_discoveries"] });
      notify('toasts.hooks.analysisComplete');
    },
    onError: (error: Error) => {
      console.error("Pattern analysis error:", error);
      
      if (error.message?.includes('Rate limits exceeded')) {
        notifyError('toasts.hooks.rateLimitReached', 'toasts.hooks.tooManyRequestsPleaseWaitMoment');
        return;
      }
      
      if (error.message?.includes('Payment required')) {
        notifyError('toasts.hooks.creditsRequired', 'toasts.hooks.pleaseAddCreditsYourLovableAi');
        return;
      }

      notifyError('toasts.hooks.analysisFailed');
    },
  });

  const reviewPattern = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from("pattern_discoveries")
        .update({
          status: "reviewed",
          reviewed_at: new Date().toISOString(),
          ...(notes && { review_notes: notes }),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pattern_discoveries"] });
      notify('toasts.hooks.patternReviewed', 'toasts.hooks.patternMarkedAsReviewed');
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.reviewFailed');
    },
  });

  const implementPattern = useMutation({
    mutationFn: async ({ id, ruleId }: { id: string; ruleId: string }) => {
      const { error } = await supabase
        .from("pattern_discoveries")
        .update({
          status: "implemented",
          implemented_at: new Date().toISOString(),
          linked_rule_id: ruleId,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pattern_discoveries"] });
      notify('toasts.hooks.patternImplemented', 'toasts.hooks.patternLinkedAutomationRule');
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.implementationFailed');
    },
  });

  const dismissPattern = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from("pattern_discoveries")
        .update({
          status: "dismissed",
          dismiss_reason: reason,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pattern_discoveries"] });
      notify('toasts.hooks.patternDismissed', 'toasts.hooks.patternMarkedAsNotRelevant');
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.dismissFailed');
    },
  });

  return {
    patterns,
    isLoading,
    runAnalysis,
    reviewPattern,
    implementPattern,
    dismissPattern,
  };
}
