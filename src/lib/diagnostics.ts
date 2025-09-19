/**
 * Diagnostics utilities and feature flag management
 */

export interface DiagnosticsConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxEvents: number;
}

// Feature flag check - can be controlled via environment or localStorage
export function isDiagnosticsEnabled(): boolean {
  // Check localStorage for dev override
  const localOverride = localStorage.getItem('VITANA_DIAGNOSTICS_ENABLED');
  if (localOverride === 'true') return true;
  if (localOverride === 'false') return false;
  
  // Check for development environment
  if (import.meta.env.DEV) return true;
  
  // Production - only enable if explicitly set
  return import.meta.env.VITE_DIAGNOSTICS_ENABLED === 'true';
}

// URL parameter check
export function shouldShowDiagnosticsPanel(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('diagnostics') === '1' && isDiagnosticsEnabled();
}

// Instrumentation helper for messaging hooks
export function instrumentRealtimeEvent(
  type: 'send' | 'ack' | 'delivered' | 'read' | 'typing_start' | 'typing_stop' | 'unread_change' | 'error',
  data: {
    threadId?: string;
    userId?: string;
    content?: string;
    error?: string;
    latency?: number;
  } = {}
) {
  if (!isDiagnosticsEnabled()) return;
  
  const diagnostics = (window as any).realtimeDiagnostics;
  if (diagnostics?.addEvent) {
    diagnostics.addEvent({
      type,
      threadId: data.threadId,
      userId: data.userId,
      content: data.content ? data.content.substring(0, 50) : undefined, // Truncate PII
      error: data.error,
      latency: data.latency
    });
  }
}

// Channel status tracking
export function trackChannelStatus(
  channelName: string,
  status: 'connected' | 'reconnecting' | 'failed',
  subscriptionCount?: number
) {
  if (!isDiagnosticsEnabled()) return;
  
  const diagnostics = (window as any).realtimeDiagnostics;
  if (diagnostics?.updateChannelStatus) {
    diagnostics.updateChannelStatus(channelName, status, subscriptionCount);
  }
}

// Subscription tracking
export function trackSubscription(subscription: string, action: 'add' | 'remove') {
  if (!isDiagnosticsEnabled()) return;
  
  const diagnostics = (window as any).realtimeDiagnostics;
  if (diagnostics) {
    if (action === 'add') {
      diagnostics.trackSubscription?.(subscription);
    } else {
      diagnostics.removeSubscription?.(subscription);
    }
  }
}

// Performance measurement utilities
export class PerformanceTracker {
  private startTimes = new Map<string, number>();
  
  start(operationId: string) {
    this.startTimes.set(operationId, performance.now());
  }
  
  end(operationId: string, eventType: string, data: any = {}) {
    const startTime = this.startTimes.get(operationId);
    if (startTime) {
      const latency = Math.round(performance.now() - startTime);
      instrumentRealtimeEvent(eventType as any, { ...data, latency });
      this.startTimes.delete(operationId);
    }
  }
}

// Diagnostics logging for thread operations
export function logThreadEvent(
  type: 'thread_ok' | 'thread_repaired' | 'thread_created',
  data: {
    threadId?: string;
    message?: string;
    error?: string;
  } = {}
) {
  if (!isDiagnosticsEnabled()) return;
  
  // Post to realtime diagnostics if available
  if (window.postMessage) {
    window.postMessage({
      type: 'diagnostic-event',
      data: {
        type,
        threadId: data.threadId,
        message: data.message,
        error: data.error,
        timestamp: new Date().toISOString()
      }
    }, '*');
  }
  
  // Also log to console for debugging
  console.log(`[Diagnostics] ${type}:`, data);
}

export const perfTracker = new PerformanceTracker();