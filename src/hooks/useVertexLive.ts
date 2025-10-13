import { useState, useEffect, useRef, useCallback } from 'react';
import { VertexLiveService } from '@/services/vertexLiveService';
import { supabase } from '@/integrations/supabase/client';

export const useVertexLive = () => {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>('');
  
  const serviceRef = useRef<VertexLiveService | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const manualDisconnectRef = useRef(false);

  useEffect(() => {
    // Initialize service
    serviceRef.current = new VertexLiveService({
      onConnectionChange: (connected) => {
        console.log('🔌 Connection status:', connected);
        if (connected) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          retryCountRef.current = 0;
          setConnectionState('connected');
          setLastEvent('connected');
        } else {
          setConnectionState('disconnected');
          setIsRecording(false);
          setIsScreenSharing(false);
          setLastEvent('disconnected');
        }
      },
      onTranscript: (text, isFinal) => {
        console.log('📝 Transcript:', text, 'Final:', isFinal);
        if (isFinal) {
          setTranscript((prev) => prev + ' ' + text);
        } else {
          // Temporary transcript
          setTranscript(text);
        }
      },
      onError: (errorMsg) => {
        console.error('❌ Vertex Live error:', errorMsg);
        setError((prev) => (prev === errorMsg ? prev : errorMsg));
        setConnectionState('error');
        setLastEvent('error: ' + errorMsg);
        
        // Skip auto-reconnect if this was a manual disconnect
        if (manualDisconnectRef.current) {
          console.warn('⏭️ Manual disconnect — skipping auto-reconnect');
          return;
        }

        // Exponential backoff with jitter (max 5 retries, capped at 15s)
        retryCountRef.current += 1;
        if (retryCountRef.current <= 5) {
          const base = Math.min(15000, 2000 * Math.pow(2, retryCountRef.current - 1));
          const jitter = base * (0.8 + Math.random() * 0.4); // 80%-120%
          const delay = Math.min(15000, Math.round(jitter));
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          console.log(`🔄 Attempting reconnect in ${delay}ms (try #${retryCountRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (serviceRef.current) {
              connect();
            }
          }, delay);
        } else {
          console.warn('🛑 Max reconnect attempts reached');
        }
      },
      onTrace: (message) => {
        console.log('🔍 Trace:', message);
        setLastEvent(message);
      }
    });

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      retryCountRef.current = 0;
      setError(null);
      setConnectionState('connecting');
      setLastEvent('Checking authentication...');
      manualDisconnectRef.current = false;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        const errorMsg = 'No authentication token';
        setError(errorMsg);
        setConnectionState('error');
        setLastEvent('auth_failed: no token');
        throw new Error(errorMsg);
      }

      setLastEvent('auth_ok');
      await serviceRef.current?.connect(session.access_token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      if (!error) setError(errorMsg);
      if (connectionState !== 'error') setConnectionState('error');
      console.error('Failed to connect:', err);
    }
  }, [error, connectionState]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    retryCountRef.current = 0;
    manualDisconnectRef.current = true;
    serviceRef.current?.disconnect();
    setTranscript('');
    setError(null);
    setConnectionState('disconnected');
  }, []);

  const startAudio = useCallback(async () => {
    try {
      // Check if service is ready before starting
      if (!serviceRef.current?.isConnected()) {
        throw new Error('Setup not complete');
      }
      await serviceRef.current?.startAudio();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to start audio recording');
      throw err; // Re-throw so caller knows it failed
    }
  }, []);

  const stopAudio = useCallback(() => {
    serviceRef.current?.stopAudio();
    setIsRecording(false);
  }, []);

  const startScreen = useCallback(async () => {
    try {
      await serviceRef.current?.startScreen();
      setIsScreenSharing(true);
    } catch (err) {
      console.error('Failed to start screen sharing:', err);
      setError('Failed to start screen sharing');
    }
  }, []);

  const stopScreen = useCallback(() => {
    serviceRef.current?.stopScreen();
    setIsScreenSharing(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      await serviceRef.current?.startCamera();
      setIsCameraActive(true);
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to start camera');
    }
  }, []);

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera();
    setIsCameraActive(false);
  }, []);

  const sendText = useCallback((text: string) => {
    serviceRef.current?.sendText(text);
  }, []);

  return {
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isError: connectionState === 'error',
    connectionState,
    isRecording,
    isScreenSharing,
    isCameraActive,
    transcript,
    error,
    lastEvent,
    connect,
    disconnect,
    startAudio,
    stopAudio,
    startScreen,
    stopScreen,
    startCamera,
    stopCamera,
    sendText
  };
};
