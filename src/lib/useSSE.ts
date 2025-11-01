import { useEffect, useRef } from "react";
import { sseManager } from "./sseConnectionManager";

const MAX_RETRIES = 5;
const HEALTH_CHECK_TIMEOUT = 5000;

type Options = {
  url: string;
  onEvent: (data: any) => void;
  onStatus?: (connected: boolean) => void;
  onMaxRetriesExceeded?: () => void;
  getHeaders?: () => Record<string, string>;
  maxBackoffMs?: number;
};

export function useSSE({ 
  url, 
  onEvent, 
  onStatus,
  onMaxRetriesExceeded,
  getHeaders, 
  maxBackoffMs = 30000 
}: Options) {
  const connectionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const failCountRef = useRef(0);
  const lastSuccessRef = useRef<number>(Date.now());
  
  useEffect(() => {
    // Prevent double mount in React Strict Mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    let aborted = false;
    let backoff = 1000;

    // Pre-flight health check
    const checkHealth = async (): Promise<boolean> => {
      try {
        const baseUrl = url.replace('/events/stream', '');
        const healthUrl = `${baseUrl}/events?limit=1`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
        
        const response = await fetch(healthUrl, {
          signal: controller.signal,
          mode: 'cors',
          credentials: 'include'
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
          setTimeout(connect, backoff);
          backoff = Math.min(backoff * 2, maxBackoffMs);
          return;
        }
        console.log('✅ Backend healthy, attempting reconnection...');
      }
      
      // IMPORTANT: Public SSE - no credentials, no custom headers
      const es = new EventSource(url.trim());
      connectionIdRef.current = sseManager.register(url, es);
      
      es.onopen = () => {
        console.log('✅ SSE connected successfully');
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
      
      es.onerror = () => {
        failCountRef.current++;
        console.warn(`⚠️ SSE error (attempt ${failCountRef.current}/${MAX_RETRIES})`);
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
        
        setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, maxBackoffMs);
      };
    };

    connect();
    
    return () => {
      aborted = true;
      mountedRef.current = false;
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
