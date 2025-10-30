import { useEffect, useRef } from "react";

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
  const stopRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    let aborted = false;
    let backoff = 1000;

    const connect = () => {
      if (aborted) return;
      
      // IMPORTANT: Public SSE - no credentials, no custom headers
      const es = new EventSource(url.trim());
      
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
        es.close();
        setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, maxBackoffMs);
      };
      
      stopRef.current = () => es.close();
    };

    connect();
    
    return () => {
      aborted = true;
      stopRef.current?.();
    };
  }, [url, onEvent, onStatus, maxBackoffMs]);
}
