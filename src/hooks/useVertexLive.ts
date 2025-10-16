import { useState, useEffect, useRef, useCallback } from 'react';
import { VertexLiveService } from '@/services/vertexLiveService';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationBell } from '@/utils/soundEffects';

export const useVertexLive = () => {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'gemini_ready' | 'connected' | 'error'>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>('');
  
  const serviceRef = useRef<VertexLiveService | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const hasGreetedRef = useRef(false);
  const ringPlayedInSessionRef = useRef(false); // Track if we've rung the bell this session
  const connectionTriggerRef = useRef<'mic' | 'camera' | 'screen' | null>(null);
  const screenBellRangRef = useRef(false);
  const cameraBellRangRef = useRef(false);
  const connectionStateRef = useRef<'disconnected' | 'connecting' | 'gemini_ready' | 'connected' | 'error'>(connectionState);

  // Keep ref in sync with state
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  useEffect(() => {
    // Initialize service
    serviceRef.current = new VertexLiveService({
      onConnectionReady: () => {
        console.log('🔌 WebSocket connected - waiting for Gemini confirmation...');
        setConnectionState('connecting'); // Still connecting, not ready yet
        setLastEvent('websocket_ready');
      },
      onGeminiReady: () => {
        console.log('🎉 Gemini AI is ready!');
        
        // Only ring and greet once per session (not on reconnects)
        if (!ringPlayedInSessionRef.current) {
          ringPlayedInSessionRef.current = true;
          hasGreetedRef.current = true;
          
          // Only ring bell for screen or camera, NOT mic
          if (connectionTriggerRef.current === 'screen' || connectionTriggerRef.current === 'camera') {
            console.log('🔔 Ringing bell for', connectionTriggerRef.current);
            playNotificationBell();
          } else {
            console.log('🔕 Skipping bell for mic');
          }
          
          // Set to gemini_ready state (this is what UI will check)
          setConnectionState('gemini_ready');
          setLastEvent('gemini_ready');
          
          // Send greeting prompt to AI (AI will respond with audio)
          setTimeout(() => {
            serviceRef.current?.sendText(
              "Please greet the user warmly and let them know you're ready to help. Keep it brief and friendly, around 1-2 sentences."
            );
          }, 500);
        } else {
          // On reconnection, just log - don't ring or greet again
          console.log('✅ Reconnected to Gemini (skipping greeting/bell)');
          setConnectionState('gemini_ready');
        }
      },
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
          hasGreetedRef.current = false; // Reset for next connection
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
          setError('Failed to connect after 3 attempts. Please check your connection and try again.');
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
    serviceRef.current?.disconnect();
    setTranscript('');
    setError(null); // Explicitly clear errors on disconnect
    setConnectionState('disconnected');
    // Reset all session flags
    ringPlayedInSessionRef.current = false;
    screenBellRangRef.current = false;
    cameraBellRangRef.current = false;
  }, []);

  const startAudio = useCallback(async () => {
    try {
      connectionTriggerRef.current = 'mic';
      
      // Gate audio start on Gemini readiness
      const currentState = connectionStateRef.current;
      if (currentState !== 'gemini_ready' && currentState !== 'connected') {
        console.log('🎤 Audio requires connection, connecting...');
        await connect();
        
        // Wait for Gemini readiness (up to 30s)
        const startTime = Date.now();
        while (connectionStateRef.current !== 'gemini_ready' && connectionStateRef.current !== 'connected') {
          await new Promise(resolve => setTimeout(resolve, 150));
          if (Date.now() - startTime > 30000) {
            throw new Error('Connection timeout starting audio');
          }
        }
      }
      
      await serviceRef.current?.startAudio();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to start audio recording');
      setIsRecording(false);
      throw err;
    }
  }, [connect]);

  const stopAudio = useCallback(() => {
    serviceRef.current?.stopAudio();
    setIsRecording(false);
  }, []);

  const startScreen = useCallback(async () => {
    try {
      connectionTriggerRef.current = 'screen';
      await serviceRef.current?.startScreen();
      setIsScreenSharing(true);
      
      // Ring bell if Gemini already ready and not already rang for screen
      if (connectionState === 'gemini_ready' && !screenBellRangRef.current) {
        console.log('🔔 Ringing bell for mid-session screen start');
        playNotificationBell();
        screenBellRangRef.current = true;
      }
    } catch (err) {
      console.error('Failed to start screen sharing:', err);
      setError('Failed to start screen sharing');
    }
  }, [connectionState]);

  const stopScreen = useCallback(() => {
    serviceRef.current?.stopScreen();
    setIsScreenSharing(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      connectionTriggerRef.current = 'camera';
      
      // Gate camera start on Gemini readiness
      const currentState = connectionStateRef.current;
      if (currentState !== 'gemini_ready' && currentState !== 'connected') {
        console.log('📹 Camera requires connection, connecting...');
        await connect();
        
        // Wait for Gemini readiness (up to 30s) using ref
        const startTime = Date.now();
        while (connectionStateRef.current !== 'gemini_ready' && connectionStateRef.current !== 'connected') {
          await new Promise(resolve => setTimeout(resolve, 150));
          if (Date.now() - startTime > 30000) {
            throw new Error('Connection timeout starting camera');
          }
        }
      }
      
      // Only set camera active after successful start
      await serviceRef.current?.startCamera();
      setIsCameraActive(true);
      
      // Ring bell if Gemini already ready and not already rang for camera
      if (connectionStateRef.current === 'gemini_ready' && !cameraBellRangRef.current) {
        console.log('🔔 Ringing bell for mid-session camera start');
        playNotificationBell();
        cameraBellRangRef.current = true;
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera');
    }
  }, [connect]);

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera();
    setIsCameraActive(false);
    
    // Cascade: stop audio when camera stops
    if (isRecording) {
      console.log('📹 Camera stopped → stopping microphone');
      serviceRef.current?.stopAudio();
      setIsRecording(false);
    }
  }, [isRecording]);

  const sendText = useCallback((text: string) => {
    serviceRef.current?.sendText(text);
  }, []);

  // Allow audio-only sessions: do not auto-stop mic when camera/screen are off
  useEffect(() => {
    // Intentionally left blank to prevent unwanted mic auto-stop
  }, [isCameraActive, isScreenSharing, isRecording]);

  return {
    isConnected: connectionState === 'gemini_ready' || connectionState === 'connected',
    isGeminiReady: connectionState === 'gemini_ready' || connectionState === 'connected',
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
