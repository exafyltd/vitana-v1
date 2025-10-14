import { supabase } from '@/integrations/supabase/client';
import { AudioRecorder, ScreenRecorder, CameraRecorder, encodeAudioForVertex, playAudioData, clearAudioQueue } from '@/utils/vertexAudio';

export interface VertexLiveCallbacks {
  onConnectionChange?: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
  onTrace?: (message: string) => void;
}

export class VertexLiveService {
  private ws: WebSocket | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private screenRecorder: ScreenRecorder | null = null;
  private cameraRecorder: CameraRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private callbacks: VertexLiveCallbacks;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private setupComplete = false;
  private transcript = '';

  constructor(callbacks: VertexLiveCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async connect(token: string): Promise<void> {
    this.trace('🔌 Connecting to Vertex AI Live...');
    this.updateConnectionState('connecting');

    try {
      // Initialize AudioContext
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

      // Connect to WebSocket proxy
      const wsHost = 'inmkhvwdcuyhnxkgfvsb.supabase.co'.replace('.supabase.co', '.functions.supabase.co');
      const wsUrl = `wss://${wsHost}/vertex-live?token=${encodeURIComponent(token)}`;
      
      this.trace(`📡 Connecting to: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.trace('✅ WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };

      this.ws.onerror = (error) => {
        this.trace(`❌ WebSocket error: ${error}`);
        this.updateConnectionState('error');
        this.callbacks.onError?.('WebSocket connection failed');
      };

      this.ws.onclose = (event) => {
        this.trace(`🔌 WebSocket closed: ${event.code} ${event.reason}`);
        this.updateConnectionState('disconnected');
        this.cleanup();
      };

    } catch (error) {
      this.trace(`❌ Connection error: ${error}`);
      this.updateConnectionState('error');
      throw error;
    }
  }

  private handleServerMessage(data: string | Blob) {
    if (data instanceof Blob) {
      // Binary audio data
      data.arrayBuffer().then(buffer => {
        const uint8Array = new Uint8Array(buffer);
        if (this.audioContext) {
          playAudioData(this.audioContext, uint8Array);
        }
      });
      return;
    }

    // Parse JSON message
    try {
      const message = JSON.parse(data);
      
      if (message.setupComplete) {
        this.trace('✅ Setup complete');
        this.setupComplete = true;
        this.updateConnectionState('connected');
      }
      
      if (message.serverContent) {
        // Handle audio output
        if (message.serverContent.modelTurn?.parts) {
          for (const part of message.serverContent.modelTurn.parts) {
            if (part.inlineData?.data) {
              // Base64 audio data
              const binaryString = atob(part.inlineData.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              if (this.audioContext) {
                playAudioData(this.audioContext, bytes);
              }
            }
          }
        }
        
        // Handle text transcription
        if (message.serverContent.outputTranscription?.text) {
          this.transcript += message.serverContent.outputTranscription.text;
          this.callbacks.onTranscription?.(this.transcript);
        }
        
        // Handle turn complete
        if (message.serverContent.turnComplete) {
          this.trace('✅ Turn complete');
        }
        
        // Handle interruption
        if (message.serverContent.interrupted) {
          this.trace('⚠️ Interrupted by user');
          clearAudioQueue();
        }
      }
      
      if (message.type === 'error') {
        this.trace(`❌ Server error: ${message.error}`);
        this.callbacks.onError?.(message.error);
      }
      
    } catch (error) {
      this.trace(`❌ Error parsing message: ${error}`);
    }
  }

  async startAudio() {
    if (this.audioRecorder) {
      this.trace('⚠️ Audio already recording');
      return;
    }

    this.trace('🎤 Starting audio recording...');
    
    this.audioRecorder = new AudioRecorder(
      (audioData) => {
        if (this.ws?.readyState === WebSocket.OPEN && this.setupComplete) {
          const base64Audio = encodeAudioForVertex(audioData);
          const message = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'audio/pcm;rate=24000',
                data: base64Audio
              }]
            }
          };
          this.ws.send(JSON.stringify(message));
        }
      },
      (trace) => this.trace(trace)
    );

    await this.audioRecorder.start();
  }

  stopAudio() {
    if (this.audioRecorder) {
      this.audioRecorder.stop();
      this.audioRecorder = null;
      this.trace('🛑 Audio recording stopped');
    }
  }

  async startScreen() {
    if (this.screenRecorder) {
      this.trace('⚠️ Screen already sharing');
      return;
    }

    this.trace('🖥️ Starting screen share...');
    
    this.screenRecorder = new ScreenRecorder(
      (base64Image) => {
        if (this.ws?.readyState === WebSocket.OPEN && this.setupComplete) {
          const message = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'image/jpeg',
                data: base64Image
              }]
            }
          };
          this.ws.send(JSON.stringify(message));
        }
      },
      (trace) => this.trace(trace)
    );

    await this.screenRecorder.start();
  }

  stopScreen() {
    if (this.screenRecorder) {
      this.screenRecorder.stop();
      this.screenRecorder = null;
      this.trace('🛑 Screen share stopped');
    }
  }

  async startCamera() {
    if (this.cameraRecorder) {
      this.trace('⚠️ Camera already active');
      return;
    }

    this.trace('📹 Starting camera...');
    
    this.cameraRecorder = new CameraRecorder(
      (base64Image) => {
        if (this.ws?.readyState === WebSocket.OPEN && this.setupComplete) {
          const message = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'image/jpeg',
                data: base64Image
              }]
            }
          };
          this.ws.send(JSON.stringify(message));
        }
      },
      (trace) => this.trace(trace)
    );

    await this.cameraRecorder.start();
  }

  stopCamera() {
    if (this.cameraRecorder) {
      this.cameraRecorder.stop();
      this.cameraRecorder = null;
      this.trace('🛑 Camera stopped');
    }
  }

  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupComplete) {
      this.trace('⚠️ Cannot send text: not connected');
      return;
    }

    this.trace(`📤 Sending text: ${text}`);
    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turnComplete: true
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    this.trace('🔌 Disconnecting...');
    
    this.stopAudio();
    this.stopScreen();
    this.stopCamera();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    clearAudioQueue();
    this.setupComplete = false;
    this.transcript = '';
    this.updateConnectionState('disconnected');
    
    this.trace('✅ Disconnected');
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.setupComplete;
  }

  private updateConnectionState(state: typeof this.connectionState) {
    this.connectionState = state;
    this.callbacks.onConnectionChange?.(state);
  }

  private trace(message: string) {
    console.log(message);
    this.callbacks.onTrace?.(message);
  }

  private cleanup() {
    this.stopAudio();
    this.stopScreen();
    this.stopCamera();
    clearAudioQueue();
  }
}
