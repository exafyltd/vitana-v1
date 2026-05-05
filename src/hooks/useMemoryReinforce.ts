import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

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

      notify('toasts.hooks.memoryUpdated');
    },
    onError: (error) => {
      notifyError('toasts.hooks.updateFailed');
    }
  });

  return {
    reinforceMemory: reinforceMutation.mutate,
    isReinforcing: reinforceMutation.isPending
  };
}
