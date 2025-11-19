import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VitanalandLiveCallbacks {
  onConnectionChange?: (connected: boolean) => void;
  onConnectionReady?: () => void;
  onGeminiReady?: () => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onAudioResponse?: (blob: Blob) => void;
  onResponseComplete?: () => void;
  onToolCall?: (toolCall: any) => void;
}

class VitanalandLiveService {
  private ws: WebSocket | null = null;
  private callbacks: VitanalandLiveCallbacks = {};
  private isSetupComplete = false;

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
        console.log('[VITANALAND Service] ✅ WebSocket connected');
        this.callbacks.onConnectionReady?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[VITANALAND Service] 📨 Message type:', data.type);

          if (data.type === 'ready') {
            this.isSetupComplete = true;
            this.callbacks.onGeminiReady?.();
            this.callbacks.onConnectionChange?.(true);
          } else if (data.type === 'error') {
            this.callbacks.onError?.(data.message);
          } else if (data.toolCall) {
            console.log('[VITANALAND Service] 🔧 Tool call received:', data.toolCall);
            this.callbacks.onToolCall?.(data.toolCall);
          } else if (data.serverContent) {
            this.handleServerContent(data.serverContent);
          }
        } catch (err) {
          console.error('[VITANALAND Service] ❌ Error processing message:', err);
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
    }
    
    if (serverContent.modelTurn) {
      const parts = serverContent.modelTurn.parts || [];
      for (const part of parts) {
        if (part.text) {
          this.callbacks.onTranscript?.(part.text, true);
        }
        if (part.inlineData?.data) {
          try {
            const audioData = atob(part.inlineData.data);
            const bytes = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              bytes[i] = audioData.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/pcm' });
            this.callbacks.onAudioResponse?.(blob);
          } catch (err) {
            console.error('[VITANALAND Service] Error decoding audio:', err);
          }
        }
      }
    }
  }

  disconnect(): void {
    console.log('[VITANALAND Service] 🔌 Disconnecting...');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendAudio(audioData: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete) {
      this.ws.send(JSON.stringify({
        client_content: {
          turns: [{ role: "user", parts: [{ inline_data: { mime_type: "audio/pcm", data: audioData } }] }],
          turn_complete: true
        }
      }));
    }
  }

  sendText(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete) {
      this.ws.send(JSON.stringify({
        client_content: {
          turns: [{ role: "user", parts: [{ text }] }],
          turn_complete: true
        }
      }));
    }
  }
}

export const useVitanalandLive = () => {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'ready' | 'error'>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<VitanalandLiveService | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const callbacks: VitanalandLiveCallbacks = {
      onConnectionReady: () => {
        console.log('[VITANALAND Hook] 🔌 WebSocket ready');
        setConnectionState('connecting');
      },
      onGeminiReady: () => {
        console.log('[VITANALAND Hook] ✅ Gemini ready');
        setConnectionState('ready');
      },
      onConnectionChange: (connected) => {
        console.log('[VITANALAND Hook] 🔌 Connection status:', connected);
        if (!connected) {
          setConnectionState('disconnected');
          setIsListening(false);
          setIsProcessing(false);
        }
      },
      onError: (errorMsg) => {
        console.error('[VITANALAND Hook] ❌ Error:', errorMsg);
        setError(errorMsg);
        setConnectionState('error');
      },
      onTranscript: (text, isFinal) => {
        console.log('[VITANALAND Hook] 📝 Transcript:', text, 'final:', isFinal);
        if (isFinal) {
          setTranscript(text);
          setIsListening(false);
          setIsProcessing(true);
        }
      },
      onAudioResponse: (_blob) => {
        console.log('[VITANALAND Hook] 🔊 Audio response');
        setIsProcessing(false);
      },
      onResponseComplete: () => {
        console.log('[VITANALAND Hook] ✅ Response complete');
        setIsProcessing(false);
      },
    };

    serviceRef.current = new VitanalandLiveService(callbacks);

    return () => {
      console.log('[VITANALAND Hook] 🧹 Cleanup');
      serviceRef.current?.disconnect();
      serviceRef.current = null;
    };
  }, []);

  const connect = useCallback(async (onToolCall?: (toolCall: any) => void) => {
    console.log('[VITANALAND Hook] 🔌 Connecting...');
    
    // Update callbacks with tool call handler
    if (onToolCall && serviceRef.current) {
      const currentCallbacks = (serviceRef.current as any).callbacks;
      (serviceRef.current as any).callbacks = {
        ...currentCallbacks,
        onToolCall,
      };
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError('Not authenticated');
      setConnectionState('error');
      return;
    }
    
    if (serviceRef.current) {
      setError(null);
      setConnectionState('connecting');
      await serviceRef.current.connect(session.access_token);
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('[VITANALAND Hook] 🔌 Disconnecting...');
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      setConnectionState('disconnected');
      setIsListening(false);
      setIsProcessing(false);
      setTranscript('');
      setError(null);
    }
  }, []);

  const startListening = useCallback(async () => {
    console.log('[VITANALAND Hook] 🎤 Start listening');
    if (connectionState !== 'ready') {
      console.warn('[VITANALAND Hook] Not ready to listen');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          serviceRef.current?.sendAudio(base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      audioRecorderRef.current = recorder;
      setIsListening(true);
      setTranscript('');
    } catch (err) {
      console.error('[VITANALAND Hook] Microphone error:', err);
      setError('Microphone access denied');
    }
  }, [connectionState]);

  const stopListening = useCallback(() => {
    console.log('[VITANALAND Hook] 🎤 Stop listening');
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    setIsListening(false);
  }, []);

  const sendMessage = useCallback((text: string) => {
    console.log('[VITANALAND Hook] 💬 Sending text:', text);
    if (serviceRef.current && connectionState === 'ready') {
      serviceRef.current.sendText(text);
      setIsProcessing(true);
    }
  }, [connectionState]);

  return {
    connectionState,
    isListening,
    isProcessing,
    transcript,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
  };
};
