import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useHealthLogger } from './useHealthLogger';
import { notify, notifyError } from '@/lib/i18n-toast';

export interface UserSupplement {
  id: string;
  user_id: string;
  name: string;
  category: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserSupplements() {
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { logSupplementAdd, logSupplementUpdate, logSupplementDelete } = useHealthLogger();

  const fetchSupplements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_supplements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupplements(data || []);
    } catch (error) {
      console.error('Error fetching supplements:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedLoadSupplements');
    } finally {
      setIsLoading(false);
    }
  };

  const createSupplement = async (supplement: Omit<UserSupplement, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_supplements')
        .insert([{ ...supplement, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setSupplements(prev => [data, ...prev]);
      
      // Log supplement addition
      await logSupplementAdd(data.name, data.category);
      
      notify('toasts.hooks.success', 'toasts.hooks.supplementAddedSuccessfully');
      return data;
    } catch (error) {
      console.error('Error creating supplement:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedAddSupplement');
      throw error;
    }
  };

  const updateSupplement = async (id: string, updates: Partial<UserSupplement>) => {
    try {
      const { data, error } = await supabase
        .from('user_supplements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSupplements(prev => prev.map(s => s.id === id ? data : s));
      
      // Log supplement update
      await logSupplementUpdate(data.name);
      
      notify('toasts.hooks.success', 'toasts.hooks.supplementUpdatedSuccessfully');
      return data;
    } catch (error) {
      console.error('Error updating supplement:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedUpdateSupplement');
      throw error;
    }
  };

  const deleteSupplement = async (id: string) => {
    try {
      // Get supplement name before deleting
      const supplement = supplements.find(s => s.id === id);
      
      const { error } = await supabase
        .from('user_supplements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSupplements(prev => prev.filter(s => s.id !== id));
      
      // Log supplement deletion
      if (supplement) {
        await logSupplementDelete(supplement.name);
      }
      
      notify('toasts.hooks.success', 'toasts.hooks.supplementDeletedSuccessfully');
    } catch (error) {
      console.error('Error deleting supplement:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedDeleteSupplement');
      throw error;
    }
  };

  useEffect(() => {
    fetchSupplements();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('user_supplements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_supplements',
        },
        () => {
          fetchSupplements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    supplements,
    isLoading,
    createSupplement,
    updateSupplement,
    deleteSupplement,
    refetch: fetchSupplements,
  };
}
