/**
 * Diagnostics and logging utilities for messaging system
 */
import { supabase } from '@/integrations/supabase/client';

export type DiagnosticEvent = 
  | 'thread_created'
  | 'thread_ok'
  | 'thread_repaired'
  | 'message_sent'
  | 'message_failed'
  | 'realtime_connected'
  | 'realtime_error';

interface DiagnosticData {
  threadId?: string;
  context?: 'global' | 'tenant';
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Log diagnostic events for debugging messaging issues
 */
export const logDiagnosticEvent = (
  event: DiagnosticEvent, 
  data: DiagnosticData = {}
) => {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ...data
  };

  // Console log for debugging
  console.log(`[DIAGNOSTICS] ${event}:`, logData);

  // Optional: Send to analytics or monitoring service
  // analytics.track('messaging_diagnostic', logData);
};

/**
 * Log thread-specific events with standardized format
 */
export const logThreadEvent = (
  event: 'thread_created' | 'thread_ok' | 'thread_repaired',
  threadId: string,
  context: 'global' | 'tenant',
  metadata?: Record<string, any>
) => {
  logDiagnosticEvent(event, {
    threadId,
    context,
    metadata
  });
};

/**
 * Health check for thread participants - simplified version for type safety
 */
export const checkThreadHealth = async (
  threadId: string,
  context: 'global' | 'tenant'
): Promise<{ isHealthy: boolean; repaired?: boolean }> => {
  try {
    // Simple health check - verify we can access the thread
    const table = context === 'global' ? 'global_message_threads' : 'message_threads';
    const { data: thread, error } = await supabase
      .from(table)
      .select('id')
      .eq('id', threadId)
      .single();

    if (error) {
      logDiagnosticEvent('realtime_error', {
        threadId,
        context,
        error: error.message
      });
      return { isHealthy: false };
    }

    if (thread) {
      logThreadEvent('thread_ok', threadId, context);
      return { isHealthy: true };
    }

    return { isHealthy: false };
  } catch (error) {
    logDiagnosticEvent('realtime_error', {
      threadId,
      context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { isHealthy: false };
  }
};