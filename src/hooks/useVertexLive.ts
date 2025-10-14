import { useState, useEffect, useCallback, useRef } from 'react';
import { VertexLiveService, VertexLiveCallbacks } from '@/services/vertexLiveService';
import { supabase } from '@/integrations/supabase/client';

export const useVertexLive = () => {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const serviceRef = useRef<VertexLiveService | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Initialize service
  useEffect(() => {
    const callbacks: VertexLiveCallbacks = {
      onConnectionChange: (state) => {
        setConnectionState(state);
        setLastEvent(`Connection: ${state}`);
        
        // Handle auto-reconnect on error
        if (state === 'error' && reconnectAttemptsRef.current < 3) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Auto-reconnecting (attempt ${reconnectAttemptsRef.current})...`);
            connect();
          }, delay + Math.random() * 1000); // Add jitter
        }
      },
      onTranscription: (text) => {
        setTranscript(text);
        setLastEvent('Transcription received');
      },
      onError: (err) => {
        setError(err);
        setLastEvent(`Error: ${err}`);
      },
      onTrace: (message) => {
        setLastEvent(message);
      }
    };

    serviceRef.current = new VertexLiveService(callbacks);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      serviceRef.current?.disconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    if (!serviceRef.current) return;

    try {
      setError(null);
      setConnectionState('connecting');

      // Get auth token from vertex-auth edge function
      const { data, error: authError } = await supabase.functions.invoke('vertex-auth');
      
      if (authError) throw new Error(`Auth failed: ${authError.message}`);
      if (!data?.access_token) throw new Error('No access token received');

      await serviceRef.current.connect(data.access_token);
      reconnectAttemptsRef.current = 0; // Reset on successful connection
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setConnectionState('error');
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = 0;
    
    setIsRecording(false);
    setIsScreenSharing(false);
    setIsCameraActive(false);
    setTranscript('');
    setError(null);
    
    serviceRef.current?.disconnect();
  }, []);

  const startAudio = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.startAudio();
    setIsRecording(true);
  }, []);

  const stopAudio = useCallback(() => {
    serviceRef.current?.stopAudio();
    setIsRecording(false);
  }, []);

  const startScreen = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.startScreen();
    setIsScreenSharing(true);
  }, []);

  const stopScreen = useCallback(() => {
    serviceRef.current?.stopScreen();
    setIsScreenSharing(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.startCamera();
    setIsCameraActive(true);
  }, []);

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera();
    setIsCameraActive(false);
  }, []);

  const sendText = useCallback((text: string) => {
    serviceRef.current?.sendText(text);
  }, []);

  return {
    // State
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
    
    // Actions
    connect,
    disconnect,
    startAudio,
    stopAudio,
    startScreen,
    stopScreen,
    startCamera,
    stopCamera,
    sendText,
  };
};
