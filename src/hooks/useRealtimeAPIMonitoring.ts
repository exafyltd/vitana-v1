import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeAPIMonitoring() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to api_integrations changes
    const integrationsChannel = supabase
      .channel('api-integrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'api_integrations'
        },
        (payload) => {
          console.log('🔄 API Integration changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['api-integrations'] });
        }
      )
      .subscribe();

    // Subscribe to api_test_logs changes (for recent activity)
    const testLogsChannel = supabase
      .channel('api-test-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'api_test_logs'
        },
        (payload) => {
          console.log('📝 New test log:', payload);
          queryClient.invalidateQueries({ queryKey: ['api-test-logs'] });
          queryClient.invalidateQueries({ queryKey: ['api-integrations'] });
        }
      )
      .subscribe();

    // Subscribe to api_performance_metrics changes
    const metricsChannel = supabase
      .channel('api-performance-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'api_performance_metrics'
        },
        (payload) => {
          console.log('📊 New performance metric:', payload);
          queryClient.invalidateQueries({ queryKey: ['api-performance-metrics'] });
        }
      )
      .subscribe();

    // Subscribe to api_test_notifications changes
    const notificationsChannel = supabase
      .channel('api-test-notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'api_test_notifications'
        },
        (payload) => {
          console.log('🔔 New test notification:', payload);
          queryClient.invalidateQueries({ queryKey: ['api-test-notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(integrationsChannel);
      supabase.removeChannel(testLogsChannel);
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [queryClient]);
}
