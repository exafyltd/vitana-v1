import { useState, useEffect, useRef, useCallback } from 'react';
import { VertexLiveService } from '@/services/vertexLiveService';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationBell } from '@/utils/soundEffects';

export const useVertexLive = () => {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'gemini_ready' | 'connected' | 'error'>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
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
  const isUserDisconnectingRef = useRef(false); // Track intentional disconnects
  const micTemporarilyDisabledRef = useRef(false);
  const onResponseCompleteCallbackRef = useRef<(() => void) | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  useEffect(() => {
    // Initialize service
    serviceRef.current = new VertexLiveService({
      onConnectionReady: () => {
        console.log('🔌 WebSocket connected - waiting for Gemini confirmation...');
        // Only update to 'connecting' if we're currently 'disconnected'
        // Don't revert from 'gemini_ready' or 'connected'
        if (connectionStateRef.current === 'disconnected') {
          setConnectionState('connecting');
        }
        setLastEvent('websocket_ready');
      },
      onGeminiReady: () => {
        console.log('🎉 Gemini AI is ready!');
        console.log('🔄 State transition: gemini_ready (from:', connectionStateRef.current, ')');
        
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
        
        // Don't auto-reconnect if user intentionally disconnected
        if (isUserDisconnectingRef.current) {
          console.log('🔕 Ignoring error during user-initiated disconnect');
          return; // Exit early, don't set error state
        }
        
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
      onResponseComplete: () => {
        console.log('[VERTEX] ✅ Response complete callback');
        onResponseCompleteCallbackRef.current?.();
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
    const sessionId = `VS-${Date.now()}`;
    const t0 = performance.now();
    console.log(`[VERTEX][${sessionId}] t+0ms 🔌 Connect called`, {
      currentState: connectionState,
      isConnected: connectionState === 'connected',
      hasService: !!serviceRef.current,
      timestamp: new Date().toISOString()
    });
    
    try {
      isUserDisconnectingRef.current = false; // Clear flag when starting new connection
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      retryCountRef.current = 0;
      setError(null);
      setConnectionState('connecting');
      setLastEvent('Checking authentication...');
      
      console.log(`[VERTEX][${sessionId}] t+${(performance.now()-t0).toFixed(0)}ms 🔑 Getting auth session...`);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        const errorMsg = 'No authentication token';
        console.error(`[VERTEX][${sessionId}] t+${(performance.now()-t0).toFixed(0)}ms ❌ No auth token`);
        setError(errorMsg);
        setConnectionState('error');
        setLastEvent('auth_failed: no token');
        throw new Error(errorMsg);
      }

      console.log(`[VERTEX][${sessionId}] t+${(performance.now()-t0).toFixed(0)}ms ✅ Auth token obtained, connecting to service...`);
      setLastEvent('auth_ok');
      await serviceRef.current?.connect(session.access_token);
      console.log(`[VERTEX][${sessionId}] t+${(performance.now()-t0).toFixed(0)}ms ✅ Service connected, session ID: ${sessionId}`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      console.error(`[VERTEX][${sessionId}] t+${(performance.now()-t0).toFixed(0)}ms ❌ Connect failed:`, err);
      if (!error) setError(errorMsg);
      if (connectionState !== 'error') setConnectionState('error');
    }
  }, [error, connectionState]);

  const disconnect = useCallback(() => {
    isUserDisconnectingRef.current = true; // Set flag BEFORE disconnect
    
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
    micTemporarilyDisabledRef.current = false; // Reset mic disabled flag
    
    // Clear flag after longer delay (allow disconnect to complete)
    setTimeout(() => {
      isUserDisconnectingRef.current = false;
    }, 1000);
  }, []);

  const startAudio = useCallback(async () => {
    try {
      connectionTriggerRef.current = 'mic';
      
      // Gate audio start on Gemini readiness
      const currentState = connectionStateRef.current;
      if (currentState !== 'gemini_ready' && currentState !== 'connected') {
        console.log('🎤 Audio requires connection, connecting...');
        await connect();
        
        // Wait for Gemini readiness (up to 15s with progress updates)
        const startTime = Date.now();
        let lastProgressLog = 0;
        while (connectionStateRef.current !== 'gemini_ready' && connectionStateRef.current !== 'connected') {
          await new Promise(resolve => setTimeout(resolve, 150));
          const elapsed = Date.now() - startTime;
          
          // Log progress every 3 seconds
          if (elapsed - lastProgressLog > 3000) {
            console.log(`⏳ Waiting for Gemini... (${Math.round(elapsed/1000)}s elapsed)`);
            lastProgressLog = elapsed;
          }
          
          if (elapsed > 15000) {
            throw new Error('Connection timed out while starting audio. Tap to retry.');
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
      
      // Stop mic if active (screen disables mic)
      if (isRecording) {
        console.log('[SCREEN] 🛑 Stopping mic (screen policy)');
        stopAudio();
      }
      
      // Mark mic as temporarily disabled
      micTemporarilyDisabledRef.current = true;
      
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
      micTemporarilyDisabledRef.current = false;
    }
  }, [connectionState, isRecording, stopAudio]);

  const stopScreen = useCallback(() => {
    serviceRef.current?.stopScreen();
    setIsScreenSharing(false);
    
    // Re-enable mic control (do NOT auto-start mic)
    micTemporarilyDisabledRef.current = false;
    console.log('[SCREEN] ✅ Mic control re-enabled');
  }, []);

  const startCamera = useCallback(async () => {
    try {
      connectionTriggerRef.current = 'camera';
      
      // Stop mic if active (camera disables mic)
      if (isRecording) {
        console.log('[CAMERA] 🛑 Stopping mic (camera policy)');
        stopAudio();
      }
      
      // Mark mic as temporarily disabled
      micTemporarilyDisabledRef.current = true;
      
      // Gate camera start on Gemini readiness
      const currentState = connectionStateRef.current;
      if (currentState !== 'gemini_ready' && currentState !== 'connected') {
        console.log('📹 Camera requires connection, connecting...');
        await connect();
        
        // Wait for Gemini readiness (up to 15s with progress logging)
        const startTime = Date.now();
        let lastProgressLog = 0;
        while (connectionStateRef.current !== 'gemini_ready' && connectionStateRef.current !== 'connected') {
          await new Promise(resolve => setTimeout(resolve, 150));
          const elapsed = Date.now() - startTime;
          
          // Log progress every 3 seconds
          if (elapsed - lastProgressLog > 3000) {
            console.log(`📹 Still waiting for Gemini... (${Math.round(elapsed/1000)}s elapsed)`);
            lastProgressLog = elapsed;
          }
          
          if (elapsed > 15000) {
            throw new Error('Connection timeout starting camera - try reconnecting');
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
      micTemporarilyDisabledRef.current = false;
    }
  }, [connect, isRecording, stopAudio]);

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera();
    setIsCameraActive(false);
    
    // Re-enable mic control (do NOT auto-start mic)
    micTemporarilyDisabledRef.current = false;
    console.log('[CAMERA] ✅ Mic control re-enabled');
  }, []);

  const sendText = useCallback((text: string) => {
    serviceRef.current?.sendText(text);
  }, []);

  const sendVideoFrame = useCallback((frameData: string, mimeType?: string) => {
    serviceRef.current?.sendVideoFrame(frameData, mimeType);
  }, []);
  
  const setStreamMuted = useCallback((mute: boolean) => {
    console.log('[MUTE] Setting stream mute:', mute);
    if (isCameraActive) {
      serviceRef.current?.setCameraAudioEnabled?.(!mute);
    }
    if (isScreenSharing) {
      serviceRef.current?.setScreenAudioEnabled?.(!mute);
    }
    setIsMuted(mute);
  }, [isCameraActive, isScreenSharing]);
  
  const toggleMute = useCallback(() => {
    setStreamMuted(!isMuted);
  }, [isMuted, setStreamMuted]);
  
  const setOnResponseComplete = useCallback((callback: () => void) => {
    onResponseCompleteCallbackRef.current = callback;
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
    isMuted,
    transcript,
    error,
    lastEvent,
    micTemporarilyDisabled: micTemporarilyDisabledRef.current,
    connect,
    disconnect,
    startAudio,
    stopAudio,
    startScreen,
    stopScreen,
    startCamera,
    stopCamera,
    sendText,
    sendVideoFrame,
    toggleMute,
    setStreamMuted,
    setOnResponseComplete,
  };
};
