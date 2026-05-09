import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifySuccess } from '@/lib/i18n-toast';

export function useHealthPlans() {
  const queryClient = useQueryClient();
  
  const { data: plans, isLoading } = useQuery({
    queryKey: ['health-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_health_plans')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
  
  const generatePlan = useMutation({
    mutationFn: async ({ planType, userContext }: { planType: string; userContext: any }) => {
      const { data, error } = await supabase.functions.invoke('generate-personalized-plan', {
        body: { planType, userContext }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-plans'] });
      notifySuccess('toasts.hooks.planGeneratedSuccessfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to generate plan: ${error.message}`);
    }
  });
  
  const updateAdherence = useMutation({
    mutationFn: async ({ planId, score }: { planId: string; score: number }) => {
      const { data, error } = await supabase
        .from('user_health_plans')
        .update({ adherence_score: score, last_updated: new Date().toISOString() })
        .eq('id', planId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-plans'] });
    }
  });
  
  const logAdherence = useMutation({
    mutationFn: async ({ planId, planType, data, completed, notes }: {
      planId: string;
      planType: string;
      data: any;
      completed: boolean;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('plan_adherence_logs')
        .insert({
          user_id: user.user.id,
          plan_id: planId,
          plan_type: planType,
          data,
          completed,
          notes
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      notifySuccess('toasts.hooks.progressLogged');
      queryClient.invalidateQueries({ queryKey: ['health-plans'] });
    }
  });
  
  return {
    plans,
    isLoading,
    generatePlan,
    updateAdherence,
    logAdherence
  };
}
