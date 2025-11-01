import { useEffect, useRef } from "react";
import { sseManager } from "./sseConnectionManager";

type Options = {
  url: string;
  onEvent: (data: any) => void;
  onStatus?: (connected: boolean) => void;
  getHeaders?: () => Record<string, string>; // for JWT if needed by a proxy
  maxBackoffMs?: number;
};

export function useSSE({ 
  url, 
  onEvent, 
  onStatus, 
  getHeaders, 
  maxBackoffMs = 30000 
}: Options) {
  const connectionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  
  useEffect(() => {
    // Prevent double mount in React Strict Mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    let aborted = false;
    let backoff = 1000;

    const connect = () => {
      if (aborted) return;
      
      // IMPORTANT: Public SSE - no credentials, no custom headers
      const es = new EventSource(url.trim());
      connectionIdRef.current = sseManager.register(url, es);
      
      es.onopen = () => {
        console.log('✅ SSE connected');
        onStatus?.(true);
        backoff = 1000;
      };
      
      es.onmessage = (ev) => {
        try {
          onEvent(JSON.parse(ev.data));
        } catch (e) {
          console.warn('Failed to parse SSE event:', e);
          // ignore bad frames
        }
      };
      
      es.onerror = () => {
        console.warn('⚠️ SSE error, reconnecting...');
        onStatus?.(false);
        if (connectionIdRef.current) {
          sseManager.unregister(connectionIdRef.current);
          connectionIdRef.current = null;
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
  }, [url, onEvent, onStatus, maxBackoffMs]);
}
