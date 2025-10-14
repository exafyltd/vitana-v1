import { AudioRecorder, ScreenRecorder, CameraRecorder, encodeAudioForVertex, playAudioData, clearAudioQueue, wrapPCM16ToWav } from '@/utils/vertexAudio';

export interface VertexLiveCallbacks {
  onConnectionChange?: (connected: boolean) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onTrace?: (message: string) => void;
}

export class VertexLiveService {
  private ws: WebSocket | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private screenRecorder: ScreenRecorder | null = null;
  private cameraRecorder: CameraRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private callbacks: VertexLiveCallbacks = {};
  private conversationId: string | null = null;
  private isSetupComplete = false;

  constructor(callbacks: VertexLiveCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(token: string): Promise<void> {
    console.log('🔌 Connecting to Vertex AI Live API...');
    this.callbacks.onTrace?.('Starting connection...');

    try {
      // Create AudioContext if not exists (prevent duplicates on reconnect)
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
        console.log('✅ Created AudioContext for Vertex Live (24kHz)');
      }
      
      // Resume if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('▶️ Resumed AudioContext for Vertex Live');
      }

      // Build WebSocket URL to Supabase Edge Function (canonical path)
      const makeHosts = () => {
        const fallbackHost = 'inmkhvwdcuyhnxkgfvsb.functions.supabase.co';
        try {
          const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
          if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL');
          const parsed = new URL(supabaseUrl);
          return parsed.host.replace('.supabase.co', '.functions.supabase.co');
        } catch {
          return fallbackHost;
        }
      };
      const functionsHost = makeHosts();
      const wsUrl = `wss://${functionsHost}/vertex-live?token=${encodeURIComponent(token)}`;

      const tryConnect = (url: string) => {
        console.log('🔗 Connecting to:', url);
        this.callbacks.onTrace?.('Trying WebSocket (canonical path)...');
        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';

        // Safety: setup timeout if 'connection_ready' never arrives
        const setupTimeout = setTimeout(() => {
          if (!this.conversationId) {
            console.warn('⏱️ Setup timeout: no connection_ready received');
            this.callbacks.onError?.('Setup timeout: no connection_ready');
            try { ws.close(); } catch {}
          }
        }, 10000);

        ws.onopen = () => {
          this.ws = ws;
          console.log('✅ WebSocket connected to edge function');
          this.callbacks.onTrace?.('WebSocket open, waiting for connection_ready...');
          // No need to send auth message - it's in the URL
        };

        ws.onmessage = async (event) => {
          try {
            // Check if this is binary audio data or JSON
            if (event.data instanceof ArrayBuffer) {
              // Handle binary audio data - can be WAV or raw PCM
              const bytes = new Uint8Array(event.data);
              const isRiff = bytes.length >= 4 && 
                bytes[0] === 0x52 && bytes[1] === 0x49 && 
                bytes[2] === 0x46 && bytes[3] === 0x46;
              
              const format = isRiff ? 'wav' : 'pcm';
              console.log(`📥 audio_chunk_received (${format}): size=${bytes.byteLength}`);
              this.callbacks.onTrace?.(`audio_chunk_received (${format}): ${bytes.byteLength} bytes`);
              
              if (!this.audioContext) {
                console.error('❌ No audio context available!');
                return;
              }
              
              // Resume audio context if suspended (browser autoplay policy)
              if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('▶️ Resumed audio context');
              }
              
              try {
                // Send raw PCM chunks to AudioQueue for buffering and batch playback
                console.log('🔊 Queueing audio chunk for buffered playback:', bytes.byteLength, 'bytes');
                await playAudioData(this.audioContext, bytes);
                this.callbacks.onTrace?.(`audio_chunk_queued: ${bytes.byteLength}b`);
              } catch (error) {
                console.error('❌ Failed to queue audio:', error);
                if (error instanceof Error) {
                  console.error('Error:', error.name, error.message);
                }
                this.callbacks.onTrace?.('audio_queue_failed');
              }
            } else if (typeof event.data === 'string') {
              // Handle JSON messages
              const data = JSON.parse(event.data);
              if (data?.type === 'connection_ready' || data?.setupComplete) {
                clearTimeout(setupTimeout);
              }
              await this.handleServerMessage(data);
            } else {
              console.warn('⚠️ Unknown message type:', typeof event.data);
            }
          } catch (error) {
            console.error('Error processing server message:', error);
          }
        };

        ws.onerror = (error: Event) => {
          console.error('❌ WebSocket error:', error);
          const wsError = error as ErrorEvent;
          const errorMsg = wsError.message || 'WebSocket transport error';
          console.error('Error details:', errorMsg);
          clearTimeout(setupTimeout);
          this.callbacks.onError?.(errorMsg);
        };

        ws.onclose = (ev) => {
          const e = ev as CloseEvent;
          const reason = e?.reason || '';
          console.log('🔌 WebSocket closed', e?.code, reason);
          this.callbacks.onTrace?.(`WebSocket closed: ${e?.code} ${reason}`);

          clearTimeout(setupTimeout);

          // If we never got connection_ready, emit error
          if (!this.conversationId) {
            this.callbacks.onError?.(`WebSocket closed before ready (code ${e?.code}${reason ? ': ' + reason : ''})`);
          }

          this.callbacks.onConnectionChange?.(false);
          this.isSetupComplete = false;
        };
      };

      // Start single attempt with canonical path only
      tryConnect(wsUrl);
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
      this.callbacks.onTrace?.('Received connection_ready (waiting for setup)');
      // Don't signal connected yet - wait for setupComplete
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
      console.log('✅ Vertex AI setup complete - ready for audio/video');
      this.callbacks.onTrace?.('Setup complete');
      // Signal true connection ready NOW (after setup, not just WS open)
      this.callbacks.onConnectionChange?.(true);
      return;
    }

    // Handle server content (AI responses)
    if (data.serverContent) {
      const content = data.serverContent;
      
      if (content.modelTurn) {
        const parts = content.modelTurn.parts || [];
        
        // Handle inline audio responses from AI
        for (const part of parts) {
          if (part.inlineData?.mimeType?.includes('audio') && part.inlineData.data) {
            console.log('🔊 Received inline audio from AI:', part.inlineData.data.length, 'base64 chars');
            this.callbacks.onTrace?.(`inline_audio_received: ${part.inlineData.data.length}b`);
            
            try {
              // Base64-decode the audio data
              const base64 = part.inlineData.data as string;
              const binaryString = atob(base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              console.log('🎵 Decoded inline audio:', bytes.byteLength, 'bytes');
              
              // Queue for playback through AudioQueue
              if (this.audioContext) {
                await playAudioData(this.audioContext, bytes);
                this.callbacks.onTrace?.(`inline_audio_queued: ${bytes.byteLength}b`);
              }
            } catch (error) {
              console.error('❌ Failed to decode/queue inline audio:', error);
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

      // Flush audio buffer when turn is complete
      if (content.turnComplete) {
        console.log('🏁 Turn complete, flushing audio buffer');
        const { flushAudioQueue } = await import('@/utils/vertexAudio');
        await flushAudioQueue();
      }
    }
  }

  async startAudio() {
    if (!this.isSetupComplete) {
      console.warn('⚠️ Setup not complete, waiting...');
      return;
    }

    console.log('🎤 Starting audio recording...');
    
    this.audioRecorder = new AudioRecorder(
      (audioData) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Encode and send audio to Vertex AI
        const base64Audio = encodeAudioForVertex(audioData);
        
        const message = {
          realtimeInput: {
            mediaChunks: [{
              mimeType: "audio/pcm;rate=16000",
              data: base64Audio
            }]
          }
        };

        this.ws.send(JSON.stringify(message));
      },
      this.callbacks.onTrace // Pass trace callback for mic diagnostics
    );

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

  async startCamera() {
    if (!this.isSetupComplete) {
      console.warn('⚠️ Setup not complete, waiting...');
      return;
    }

    console.log('📹 Starting camera...');
    
    this.cameraRecorder = new CameraRecorder((frameData) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      // Send camera frame to Vertex AI (1 FPS)
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

    await this.cameraRecorder.start();
  }

  stopCamera() {
    console.log('🛑 Stopping camera...');
    
    if (this.cameraRecorder) {
      this.cameraRecorder.stop();
      this.cameraRecorder = null;
    }
  }

  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected');
      this.callbacks.onError?.('Cannot send text: WebSocket not connected');
      this.callbacks.onTrace?.('send_text_failed_not_connected');
      return;
    }

    if (!this.isSetupComplete) {
      console.warn('⚠️ Setup not complete, waiting...');
      this.callbacks.onError?.('Cannot send text: Setup not complete');
      this.callbacks.onTrace?.('send_text_failed_setup_incomplete');
      return;
    }

    console.log('📤 Sending text:', text);
    this.callbacks.onTrace?.('text_message_sent');

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
    this.stopCamera();

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
