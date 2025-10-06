import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ReinforcementAction = 'confirm' | 'reference' | 'contradict';

export function useMemoryReinforce() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reinforceMutation = useMutation({
    mutationFn: async ({ memoryIds, action }: { memoryIds: string[]; action: ReinforcementAction }) => {
      const { data, error } = await supabase.functions.invoke('reinforce-memory', {
        body: { memoryIds, action }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memory-timeline"] });
      
      const actionText = variables.action === 'confirm' 
        ? 'confirmed' 
        : variables.action === 'contradict'
        ? 'marked as incorrect'
        : 'referenced';

      toast({
        title: "Memory Updated",
        description: `Memory ${actionText}. Confidence adjusted.`
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    reinforceMemory: reinforceMutation.mutate,
    isReinforcing: reinforceMutation.isPending
  };
}
