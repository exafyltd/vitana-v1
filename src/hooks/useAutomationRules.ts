import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { notifySuccess } from '@/lib/i18n-toast';

export type AutomationRule = Database["public"]["Tables"]["automation_rules"]["Row"];
export type AutomationRuleInsert = Database["public"]["Tables"]["automation_rules"]["Insert"];

export function useAutomationRules() {
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["automation_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AutomationRule[];
    },
  });

  const createRule = useMutation({
    mutationFn: async (rule: AutomationRuleInsert) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules"] });
      notifySuccess('toasts.hooks.automationRuleCreated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules"] });
      notifySuccess('toasts.hooks.ruleUpdated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("automation_rules")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules"] });
    },
  });

  return {
    rules,
    isLoading,
    createRule,
    updateRule,
    toggleRule,
  };
}
