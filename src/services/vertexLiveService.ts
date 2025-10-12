import { AudioRecorder, ScreenRecorder, encodeAudioForVertex, playAudioData, clearAudioQueue } from '@/utils/vertexAudio';

export interface VertexLiveCallbacks {
  onConnectionChange?: (connected: boolean) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export class VertexLiveService {
  private ws: WebSocket | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private screenRecorder: ScreenRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private callbacks: VertexLiveCallbacks = {};
  private conversationId: string | null = null;
  private isSetupComplete = false;

  constructor(callbacks: VertexLiveCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(token: string): Promise<void> {
    console.log('🔌 Connecting to Vertex AI Live API...');

    try {
      // Initialize audio context for playback
      this.audioContext = new AudioContext({ sampleRate: 24000 });

      // Connect to edge function WebSocket
      const wsUrl = `wss://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/vertex-live`;
      this.ws = new WebSocket(wsUrl);

      // Set auth header (send as first message after connection)
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to edge function');
        // Send auth token as first message
        this.ws!.send(JSON.stringify({ type: 'auth', token }));
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.handleServerMessage(data);
        } catch (error) {
          console.error('Error parsing server message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.callbacks.onError?.('WebSocket connection error');
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        this.callbacks.onConnectionChange?.(false);
        this.isSetupComplete = false;
      };

    } catch (error) {
      console.error('❌ Error connecting to Vertex AI:', error);
      this.callbacks.onError?.('Failed to connect');
      throw error;
    }
  }

  private async handleServerMessage(data: any) {
    console.log('📥 Server message:', data.type || Object.keys(data)[0]);

    if (data.type === 'connection_ready') {
      this.conversationId = data.conversationId;
      console.log('✅ Connection ready, conversation ID:', this.conversationId);
      this.callbacks.onConnectionChange?.(true);
      return;
    }

    if (data.type === 'error') {
      console.error('❌ Server error:', data.message);
      this.callbacks.onError?.(data.message);
      return;
    }

    // Handle setup complete
    if (data.setupComplete) {
      this.isSetupComplete = true;
      console.log('✅ Vertex AI setup complete');
      return;
    }

    // Handle server content (AI responses)
    if (data.serverContent) {
      const content = data.serverContent;
      
      if (content.modelTurn) {
        const parts = content.modelTurn.parts || [];
        
        // Handle audio responses
        for (const part of parts) {
          if (part.inlineData && part.inlineData.mimeType?.includes('audio')) {
            const audioBase64 = part.inlineData.data;
            const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
            
            if (this.audioContext) {
              await playAudioData(this.audioContext, audioBytes);
            }
          }

          // Handle text responses (transcripts)
          if (part.text) {
            this.callbacks.onTranscript?.(part.text, content.turnComplete || false);
          }
        }
      }

      // Handle interruptions
      if (content.interrupted) {
        console.log('⚠️ AI response interrupted');
        clearAudioQueue();
      }
    }
  }

  async startAudio() {
    if (!this.isSetupComplete) {
      console.warn('⚠️ Setup not complete, waiting...');
      return;
    }

    console.log('🎤 Starting audio recording...');
    
    this.audioRecorder = new AudioRecorder((audioData) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      // Encode and send audio to Vertex AI
      const base64Audio = encodeAudioForVertex(audioData);
      
      const message = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: "audio/pcm;rate=24000",
            data: base64Audio
          }]
        }
      };

      this.ws.send(JSON.stringify(message));
    });

    await this.audioRecorder.start();
  }

  stopAudio() {
    console.log('🛑 Stopping audio recording...');
    
    if (this.audioRecorder) {
      this.audioRecorder.stop();
      this.audioRecorder = null;
    }
  }

  async startScreen() {
    if (!this.isSetupComplete) {
      console.warn('⚠️ Setup not complete, waiting...');
      return;
    }

    console.log('🖥️ Starting screen sharing...');
    
    this.screenRecorder = new ScreenRecorder((frameData) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      // Send screen frame to Vertex AI (1 FPS)
      const message = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: "image/jpeg",
            data: frameData
          }]
        }
      };

      this.ws.send(JSON.stringify(message));
    });

    await this.screenRecorder.start();
  }

  stopScreen() {
    console.log('🛑 Stopping screen sharing...');
    
    if (this.screenRecorder) {
      this.screenRecorder.stop();
      this.screenRecorder = null;
    }
  }

  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected');
      return;
    }

    if (!this.isSetupComplete) {
      console.warn('⚠️ Setup not complete, waiting...');
      return;
    }

    console.log('📤 Sending text:', text);

    const message = {
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ text }]
        }],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    console.log('🔌 Disconnecting from Vertex AI...');
    
    this.stopAudio();
    this.stopScreen();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isSetupComplete = false;
    this.conversationId = null;
    this.callbacks.onConnectionChange?.(false);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isSetupComplete;
  }
}
