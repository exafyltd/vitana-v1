import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VitanalandLiveCallbacks {
  onConnectionChange?: (connected: boolean) => void;
  onConnectionReady?: () => void;
  onGeminiReady?: () => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onAudioResponse?: (blob: Blob) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onResponseComplete?: () => void;
  onToolCall?: (toolCall: any) => void;
}

class VitanalandLiveService {
  private ws: WebSocket | null = null;
  private callbacks: VitanalandLiveCallbacks = {};
  private isSetupComplete = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isCurrentlyListening = false;

  constructor(callbacks: VitanalandLiveCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(token: string): Promise<void> {
    console.log('[VITANALAND Service] 🔌 Connecting...');
    
    try {
      const functionsHost = this.getFunctionsHost();
      const url = `wss://${functionsHost}/functions/v1/vitanaland-live?token=${encodeURIComponent(token)}`;
      
      console.log('[VITANALAND Service] 🔗 Connecting to:', url);
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[VITANALAND Service] ✅ WebSocket connected to edge function, waiting for AI setup...');
        // Don't mark as ready yet - wait for { type: 'ready' } message from server
      };

      this.ws.onmessage = (event) => {
        try {
          // Check if message is binary audio (ArrayBuffer)
          if (event.data instanceof ArrayBuffer) {
            console.log('[VITANALAND Service] 🔊 Binary audio received:', event.data.byteLength, 'bytes');
            
            // Skip empty or tiny buffers (likely control messages)
            if (event.data.byteLength < 100) {
              console.log('[VITANALAND Service] ⚠️ Skipping tiny buffer');
              return;
            }
            
            // Convert ArrayBuffer to Blob for audio playback
            const blob = new Blob([event.data], { type: 'audio/pcm' });
            
            // Trigger audio callbacks
            this.callbacks.onAudioStart?.();
            this.callbacks.onAudioResponse?.(blob);
            return; // Don't try to parse as JSON
          }

          // Handle JSON messages
          const data = JSON.parse(event.data);
          console.log('[VITANALAND Service] 📨 Incoming JSON:', data);

          // Optional legacy support for 'ready' message
          if (data.type === 'ready') {
            this.isSetupComplete = true;
            this.callbacks.onGeminiReady?.();
            this.callbacks.onConnectionChange?.(true);
          }
          
          // Handle various server response formats
          if (data.serverContent) {
            this.handleServerContent(data.serverContent);
          } else if (data.modelTurn || data.turnComplete) {
            // Server may send these at top level instead of wrapped
            this.handleServerContent(data);
          } else if (data.type === 'error') {
            this.callbacks.onError?.(data.message ?? 'Unknown error from server');
          } else if (data.toolCall) {
            console.log('[VITANALAND Service] 🔧 Tool call received:', data.toolCall);
            this.callbacks.onToolCall?.(data.toolCall);
          }
        } catch (err) {
          console.error('[VITANALAND Service] ❌ Error processing message:', err, 'Data type:', typeof event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[VITANALAND Service] ❌ WebSocket error:', error);
        this.callbacks.onError?.('Connection error');
      };

      this.ws.onclose = () => {
        console.log('[VITANALAND Service] 🔌 WebSocket closed');
        this.callbacks.onConnectionChange?.(false);
        this.isSetupComplete = false;
      };
    } catch (error) {
      console.error('[VITANALAND Service] ❌ Connection error:', error);
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Connection failed');
    }
  }

  private getFunctionsHost(): string {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const parsed = new URL(supabaseUrl);
      return parsed.host.replace('.supabase.co', '.functions.supabase.co');
    } catch {
      return 'inmkhvwdcuyhnxkgfvsb.functions.supabase.co';
    }
  }

  private handleServerContent(serverContent: any) {
    if (serverContent.turnComplete) {
      this.callbacks.onResponseComplete?.();
      this.callbacks.onAudioEnd?.();
    }
    
    if (serverContent.modelTurn) {
      const parts = serverContent.modelTurn.parts || [];
      for (const part of parts) {
        if (part.text) {
          this.callbacks.onTranscript?.(part.text, true);
        }
        if (part.inlineData?.data) {
          try {
            this.callbacks.onAudioStart?.();
            const audioData = atob(part.inlineData.data);
            const bytes = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              bytes[i] = audioData.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/pcm' });
            console.log('[VITANALAND Service] 🔊 Audio chunk received:', bytes.length, 'bytes');
            this.callbacks.onAudioResponse?.(blob);
          } catch (err) {
            console.error('[VITANALAND Service] ❌ Error processing audio:', err);
          }
        }
      }
    }
  }

  async startListening(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
      console.warn('[VITANALAND Service] Cannot start listening - not ready');
      return;
    }

    if (this.isCurrentlyListening) {
      console.log('[VITANALAND Service] Already listening');
      return;
    }

    try {
      console.log('[VITANALAND Service] 🎤 Starting audio capture...');
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isCurrentlyListening || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const base64Audio = this.encodeAudioForAPI(new Float32Array(inputData));

        const message = {
          client_content: {
            turns: [{
              role: "user",
              parts: [{
                inline_data: {
                  mime_type: "audio/pcm",
                  data: base64Audio
                }
              }]
            }],
            turn_complete: false
          }
        };

        this.ws?.send(JSON.stringify(message));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isCurrentlyListening = true;

      console.log('[VITANALAND Service] ✅ Audio streaming started');
    } catch (error) {
      console.error('[VITANALAND Service] ❌ Error starting audio:', error);
      this.callbacks.onError?.('Microphone access denied');
      this.stopListening();
    }
  }

  private encodeAudioForAPI(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    
    return btoa(binary);
  }

  stopListening(): void {
    console.log('[VITANALAND Service] 🛑 Stopping audio capture...');
    
    if (this.isCurrentlyListening && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        client_content: {
          turns: [],
          turn_complete: true
        }
      };
      this.ws.send(JSON.stringify(message));
    }

    this.isCurrentlyListening = false;

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  sendMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
      console.warn('[VITANALAND Service] Cannot send message - not ready');
      return;
    }

    const message = {
      client_content: {
        turns: [{
          role: "user",
          parts: [{ text }]
        }],
        turn_complete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    this.stopListening();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isSetupComplete = false;
  }
}

export function useVitanalandLive() {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'ready'>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<VitanalandLiveService | null>(null);
  const onToolCallRef = useRef<((toolCall: any) => void) | null>(null);
  const onAudioResponseRef = useRef<((blob: Blob) => void) | null>(null);
  const onAudioStartRef = useRef<(() => void) | null>(null);
  const onAudioEndRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async (onToolCall?: (toolCall: any) => void) => {
    if (serviceRef.current) return;

    setConnectionState('connecting');
    setError(null);
    onToolCallRef.current = onToolCall || null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const service = new VitanalandLiveService({
        onConnectionChange: (connected) => setConnectionState(connected ? 'ready' : 'disconnected'),
        onGeminiReady: () => setConnectionState('ready'),
        onError: (errorMsg) => setError(errorMsg),
        onAudioResponse: (blob) => onAudioResponseRef.current?.(blob),
        onAudioStart: () => {
          setIsSpeaking(true);
          setIsProcessing(false);
          onAudioStartRef.current?.();
        },
        onAudioEnd: () => {
          setIsSpeaking(false);
          onAudioEndRef.current?.();
        },
        onResponseComplete: () => setIsProcessing(false),
        onToolCall: (toolCall) => onToolCallRef.current?.(toolCall)
      });

      await service.connect(session.access_token);
      serviceRef.current = service;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnectionState('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setConnectionState('disconnected');
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setError(null);
  }, []);

  const startListening = useCallback(async () => {
    if (!serviceRef.current) return;
    setIsListening(true);
    setError(null);
    await serviceRef.current.startListening();
  }, []);

  const stopListening = useCallback(() => {
    if (!serviceRef.current) return;
    setIsListening(false);
    setIsProcessing(true);
    serviceRef.current.stopListening();
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!serviceRef.current) return;
    setIsProcessing(true);
    serviceRef.current.sendMessage(text);
  }, []);

  const setAudioResponseHandler = useCallback((handler: (blob: Blob) => void) => {
    onAudioResponseRef.current = handler;
  }, []);

  const setAudioStartHandler = useCallback((handler: () => void) => {
    onAudioStartRef.current = handler;
  }, []);

  const setAudioEndHandler = useCallback((handler: () => void) => {
    onAudioEndRef.current = handler;
  }, []);

  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
    };
  }, []);

  return {
    connectionState,
    isListening,
    isProcessing,
    isSpeaking,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
    setAudioResponseHandler,
    setAudioStartHandler,
    setAudioEndHandler,
  };
}
