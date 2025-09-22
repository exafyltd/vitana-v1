import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTransactionCleanup() {
  useEffect(() => {
    // Run cleanup every 5 minutes
    const cleanupInterval = setInterval(async () => {
      try {
        console.log('🧹 Running transaction cleanup...');
        
        const { data, error } = await supabase.functions.invoke('transaction-cleanup', {
          body: { trigger: 'periodic_cleanup' }
        });

        if (error) {
          console.warn('Cleanup function error:', error);
          return;
        }

        if (data?.cleanedCount > 0) {
          console.log(`✅ Cleaned up ${data.cleanedCount} abandoned transactions`);
        }
      } catch (error) {
        console.warn('Transaction cleanup failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Run once on mount
    const runInitialCleanup = async () => {
      try {
        await supabase.functions.invoke('transaction-cleanup', {
          body: { trigger: 'initial_cleanup' }
        });
      } catch (error) {
        console.warn('Initial cleanup failed:', error);
      }
    };

    runInitialCleanup();

    return () => clearInterval(cleanupInterval);
  }, []);
}