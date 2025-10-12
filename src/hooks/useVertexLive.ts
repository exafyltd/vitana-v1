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
  
  const serviceRef = useRef<VertexLiveService | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);

  useEffect(() => {
    // Initialize service
    serviceRef.current = new VertexLiveService({
      onConnectionChange: (connected) => {
        console.log('🔌 Connection status:', connected);
        if (connected) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          retryCountRef.current = 0;
          setConnectionState('connected');
        } else {
          setConnectionState('disconnected');
          setIsRecording(false);
          setIsScreenSharing(false);
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
        
        // Exponential backoff with max 3 retries
        retryCountRef.current += 1;
        if (retryCountRef.current <= 3) {
          const delay = Math.min(15000, 2000 * Math.pow(2, retryCountRef.current - 1));
          reconnectTimeoutRef.current = setTimeout(() => {
            if (serviceRef.current) {
              console.log('🔄 Attempting reconnect... (#' + retryCountRef.current + ')');
              connect();
            }
          }, delay);
        } else {
          console.warn('🛑 Max reconnect attempts reached');
        }
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
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      await serviceRef.current?.connect(session.access_token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMsg);
      setConnectionState('error');
      console.error('Failed to connect:', err);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    retryCountRef.current = 0;
    serviceRef.current?.disconnect();
    setTranscript('');
    setError(null);
    setConnectionState('disconnected');
  }, []);

  const startAudio = useCallback(async () => {
    try {
      await serviceRef.current?.startAudio();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start audio:', err);
      setError('Failed to start audio recording');
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
