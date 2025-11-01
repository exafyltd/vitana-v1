import { useEffect, useRef } from "react";
import { sseManager } from "./sseConnectionManager";

const MAX_RETRIES = 10;
const HEALTH_CHECK_TIMEOUT = 3000;

type Options = {
  url: string;
  onEvent: (data: any) => void;
  onStatus?: (connected: boolean) => void;
  onMaxRetriesExceeded?: () => void;
  getHeaders?: () => Record<string, string>;
  maxBackoffMs?: number;
  includeCredentials?: boolean;
};

export function useSSE({ 
  url, 
  onEvent, 
  onStatus,
  onMaxRetriesExceeded,
  getHeaders, 
  maxBackoffMs = 30000,
  includeCredentials = false
}: Options) {
  const connectionIdRef = useRef<string | null>(null);
  const failCountRef = useRef(0);
  const lastSuccessRef = useRef<number>(Date.now());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    // Clear any previous reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    let aborted = false;
    let backoff = 1000;

    // Pre-flight health check
    const checkHealth = async (): Promise<boolean> => {
      try {
        // Build base URL robustly (strip query and '/events/stream')
        let baseUrl: string;
        try {
          const u = new URL(url, window.location.origin);
          const cleanedPath = u.pathname.replace('/events/stream', '');
          baseUrl = `${u.origin}${cleanedPath}`;
        } catch {
          baseUrl = url.split('?')[0].replace('/events/stream', '');
        }

        const healthUrl = `${baseUrl}/events?limit=1`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
        
        const response = await fetch(healthUrl, {
          signal: controller.signal,
          mode: 'cors',
          credentials: includeCredentials ? 'include' : 'omit',
        });
        
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        console.warn('Health check failed:', error);
        return false;
      }
    };

    const connect = async () => {
      if (aborted) return;
      
      // Circuit breaker: stop after max retries
      if (failCountRef.current >= MAX_RETRIES) {
        console.error(`❌ Max retries (${MAX_RETRIES}) exceeded. Stopping reconnection attempts.`);
        onMaxRetriesExceeded?.();
        return;
      }

      // Pre-flight health check after first failure
      if (failCountRef.current > 0) {
        console.log('🏥 Running health check before reconnection...');
        const healthy = await checkHealth();
        
        if (!healthy) {
          console.warn('❌ Backend unhealthy, delaying reconnection...');
          failCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, backoff);
          backoff = Math.min(backoff * 2, maxBackoffMs);
          return;
        }
        console.log('✅ Backend healthy, attempting reconnection...');
      }
      
      // SSE connection (supports optional credentials)
      const es = includeCredentials 
        ? new EventSource(url.trim(), { withCredentials: true })
        : new EventSource(url.trim());
      connectionIdRef.current = sseManager.register(url, es);
      
      es.onopen = () => {
        const readyState = es.readyState;
        console.log(`✅ SSE connected successfully (readyState: ${readyState}, URL: ${url})`);
        failCountRef.current = 0; // Reset failure count on success
        lastSuccessRef.current = Date.now();
        onStatus?.(true);
        backoff = 1000;
      };
      
      es.onmessage = (ev) => {
        try {
          onEvent(JSON.parse(ev.data));
        } catch (e) {
          console.warn('Failed to parse SSE event:', e);
        }
      };
      
      es.onerror = (errorEvent) => {
        const readyState = es.readyState;
        const timeSinceSuccess = Date.now() - lastSuccessRef.current;
        failCountRef.current++;
        
        console.error(`⚠️ SSE error (attempt ${failCountRef.current}/${MAX_RETRIES})`);
        console.error(`   ReadyState: ${readyState} (0=CONNECTING, 1=OPEN, 2=CLOSED)`);
        console.error(`   Time since last success: ${timeSinceSuccess}ms`);
        console.error(`   URL: ${url}`);
        
        // Rapid failure detection (failing within 5s of success = backend issue)
        if (timeSinceSuccess < 5000) {
          console.error('   ⚠️ RAPID FAILURE: Connection closed within 5s - likely BACKEND ISSUE');
          console.error('   Possible causes: malformed SSE data, missing heartbeats, premature close');
        }
        
        onStatus?.(false);
        
        if (connectionIdRef.current) {
          sseManager.unregister(connectionIdRef.current);
          connectionIdRef.current = null;
        }
        
        // Check if circuit breaker should trigger
        if (failCountRef.current >= MAX_RETRIES) {
          console.error('🔴 Circuit breaker activated - max retries exceeded');
          onMaxRetriesExceeded?.();
          return;
        }
        
        reconnectTimeoutRef.current = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, maxBackoffMs);
      };
    };

    connect();
    
    return () => {
      aborted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionIdRef.current) {
        sseManager.unregister(connectionIdRef.current);
        connectionIdRef.current = null;
      }
    };
  }, [url, onEvent, onStatus, onMaxRetriesExceeded, maxBackoffMs]);
}

// Force reconnect utility (exposed for manual reconnection)
export function createSSEWithReset(options: Options) {
  // This can be called to force a fresh connection attempt
  return useSSE(options);
}
