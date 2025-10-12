import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      toast({
        title: "Analysis Complete",
        description: `Discovered ${data.patterns_discovered} new patterns`,
      });
    },
    onError: (error: Error) => {
      console.error("Pattern analysis error:", error);
      
      if (error.message?.includes('Rate limits exceeded')) {
        toast({
          title: "Rate Limit Reached",
          description: "Too many requests. Please wait a moment and try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (error.message?.includes('Payment required')) {
        toast({
          title: "Credits Required",
          description: "Please add credits to your Lovable AI workspace to continue.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze patterns",
        variant: "destructive",
      });
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
      toast({
        title: "Pattern Reviewed",
        description: "Pattern marked as reviewed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Pattern Implemented",
        description: "Pattern linked to automation rule",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Implementation Failed",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Pattern Dismissed",
        description: "Pattern marked as not relevant",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Dismiss Failed",
        description: error.message,
        variant: "destructive",
      });
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
