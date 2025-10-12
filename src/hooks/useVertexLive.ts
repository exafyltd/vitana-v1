import { useState, useEffect, useRef, useCallback } from 'react';
import { VertexLiveService } from '@/services/vertexLiveService';
import { supabase } from '@/integrations/supabase/client';

export const useVertexLive = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<VertexLiveService | null>(null);

  useEffect(() => {
    // Initialize service
    serviceRef.current = new VertexLiveService({
      onConnectionChange: (connected) => {
        console.log('🔌 Connection status:', connected);
        setIsConnected(connected);
        if (!connected) {
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
        setError(errorMsg);
      }
    });

    // Cleanup on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      await serviceRef.current?.connect(session.access_token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMsg);
      console.error('Failed to connect:', err);
    }
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
    setTranscript('');
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

  const sendText = useCallback((text: string) => {
    serviceRef.current?.sendText(text);
  }, []);

  return {
    isConnected,
    isRecording,
    isScreenSharing,
    transcript,
    error,
    connect,
    disconnect,
    startAudio,
    stopAudio,
    startScreen,
    stopScreen,
    sendText
  };
};
