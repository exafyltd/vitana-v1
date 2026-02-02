import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { isTabVisible } from '@/utils/realtimeDebounce';

export function useRealtimeAPIMonitoring() {
  const queryClient = useQueryClient();
  
  // Debounce timers for different query types
  const integrationsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const testLogsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notificationsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced invalidation helpers (2s delay)
  const invalidateIntegrations = useCallback(() => {
    if (integrationsTimerRef.current) clearTimeout(integrationsTimerRef.current);
    integrationsTimerRef.current = setTimeout(() => {
      if (isTabVisible()) {
        queryClient.invalidateQueries({ queryKey: ['api-integrations'] });
      }
      integrationsTimerRef.current = null;
    }, 2000);
  }, [queryClient]);

  const invalidateTestLogs = useCallback(() => {
    if (testLogsTimerRef.current) clearTimeout(testLogsTimerRef.current);
    testLogsTimerRef.current = setTimeout(() => {
      if (isTabVisible()) {
        queryClient.invalidateQueries({ queryKey: ['api-test-logs'] });
        queryClient.invalidateQueries({ queryKey: ['api-integrations'] });
      }
      testLogsTimerRef.current = null;
    }, 2000);
  }, [queryClient]);

  const invalidateMetrics = useCallback(() => {
    if (metricsTimerRef.current) clearTimeout(metricsTimerRef.current);
    metricsTimerRef.current = setTimeout(() => {
      if (isTabVisible()) {
        queryClient.invalidateQueries({ queryKey: ['api-performance-metrics'] });
      }
      metricsTimerRef.current = null;
    }, 2000);
  }, [queryClient]);

  const invalidateNotifications = useCallback(() => {
    if (notificationsTimerRef.current) clearTimeout(notificationsTimerRef.current);
    notificationsTimerRef.current = setTimeout(() => {
      if (isTabVisible()) {
        queryClient.invalidateQueries({ queryKey: ['api-test-notifications'] });
      }
      notificationsTimerRef.current = null;
    }, 2000);
  }, [queryClient]);

  useEffect(() => {
    // Subscribe to api_integrations changes - UPDATE only (not *)
    const integrationsChannel = supabase
      .channel('api-integrations-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'api_integrations'
        },
        (payload) => {
          console.log('🔄 API Integration changed:', payload);
          invalidateIntegrations();
        }
      )
      .subscribe();

    // Subscribe to api_test_logs changes (INSERT only)
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
          invalidateTestLogs();
        }
      )
      .subscribe();

    // Subscribe to api_performance_metrics changes (INSERT only)
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
          invalidateMetrics();
        }
      )
      .subscribe();

    // Subscribe to api_test_notifications changes (INSERT only)
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
          invalidateNotifications();
        }
      )
      .subscribe();

    return () => {
      // Clean up all timers
      if (integrationsTimerRef.current) clearTimeout(integrationsTimerRef.current);
      if (testLogsTimerRef.current) clearTimeout(testLogsTimerRef.current);
      if (metricsTimerRef.current) clearTimeout(metricsTimerRef.current);
      if (notificationsTimerRef.current) clearTimeout(notificationsTimerRef.current);
      
      supabase.removeChannel(integrationsChannel);
      supabase.removeChannel(testLogsChannel);
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [invalidateIntegrations, invalidateTestLogs, invalidateMetrics, invalidateNotifications]);
}
