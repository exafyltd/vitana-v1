import { AudioRecorder, ScreenRecorder, CameraRecorder, encodeAudioForVertex, playAudioData, clearAudioQueue, decodeContainerAndPlay, sniffAudioFormat } from '@/utils/vertexAudio';

export interface VertexLiveCallbacks {
  onConnectionChange?: (connected: boolean) => void;
  onConnectionReady?: () => void; // Triggered when WebSocket opens
  onGeminiReady?: () => void; // NEW: Triggered when Gemini AI confirms it's ready
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
  private geminiReadyFired = false; // NEW: Track if we've fired onGeminiReady

  constructor(callbacks: VertexLiveCallbacks) {
    this.callbacks = callbacks;
  }

  // Attempt to decode when binary payload actually contains base64-encoded ASCII
  private tryDecodeBase64FromBytes(bytes: Uint8Array): Uint8Array | null {
    // Quick heuristic: allow at most ~10% non-base64 ASCII bytes
    let invalid = 0;
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      const isBase64Char =
        (b >= 43 && b <= 57) || // + , - . / 0-9
        (b >= 65 && b <= 90) || // A-Z
        (b >= 97 && b <= 122) || // a-z
        b === 61 || // =
        b === 10 || // \n
        b === 13;   // \r
      if (!isBase64Char) invalid++;
      if (invalid > Math.max(8, Math.floor(bytes.length * 0.1))) {
        return null;
      }
    }
    try {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const cleaned = text.replace(/[^A-Za-z0-9+/=]/g, '');
      if (cleaned.length < 8) return null;
      const bin = atob(cleaned);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      // Heuristic: decoded should be ~3/4 of input length when it is base64
      if (out.length > 0 && out.length <= bytes.length && out.length >= Math.floor(bytes.length * 0.5)) {
        return out;
      }
      // Fallback: if we can sniff a known audio/container format, accept
      const fmt = sniffAudioFormat(out);
      if (fmt !== 'unknown') return out;
      return out;
    } catch {
      return null;
    }
  }

  async connect(token: string): Promise<void> {
    console.log('🔌 Connecting to Vertex AI Live API...');
    this.callbacks.onTrace?.('Starting connection...');

    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });

      // Build candidate WebSocket URLs (try canonical first, then legacy)
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
      const urls = [
        `wss://${functionsHost}/functions/v1/vertex-live?token=${encodeURIComponent(token)}`,
        `wss://${functionsHost}/vertex-live?token=${encodeURIComponent(token)}`,
      ];

      let attempt = 0;
      const tryConnect = (url: string) => {
        const urlDesc = attempt === 0 ? 'primary path' : 'fallback path';
        console.log('🔗 Connecting to:', url);
        this.callbacks.onTrace?.(`Trying WebSocket ${urlDesc}...`);
        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';
        let opened = false;

        ws.onopen = () => {
          opened = true;
          this.ws = ws;
          console.log('✅ WebSocket connected to edge function');
          this.callbacks.onTrace?.('WebSocket open, waiting for connection_ready...');
          // No need to send auth message - it's in the URL
        };

        ws.onmessage = async (event) => {
          try {
            // Check if this is binary audio data or JSON
            if (event.data instanceof ArrayBuffer) {
              // Handle binary audio data - detect format and decode accordingly
              console.log('📥 Received audio ArrayBuffer, size:', event.data.byteLength);
              let audioBytes = new Uint8Array(event.data);
              // Try to decode if payload is actually base64-encoded text delivered as bytes
              const maybeDecoded = this.tryDecodeBase64FromBytes(audioBytes);
              if (maybeDecoded) {
                console.log('🧪 Detected base64-in-binary; decoded to bytes:', maybeDecoded.byteLength);
                audioBytes = new Uint8Array(maybeDecoded.buffer as ArrayBuffer);
              }
              
              if (this.audioContext) {
                // Resume audio context if suspended (browser autoplay policy)
                if (this.audioContext.state === 'suspended') {
                  await this.audioContext.resume();
                  console.log('▶️ Resumed audio context');
                }
                
                // Detect audio format
                const format = sniffAudioFormat(audioBytes);
                console.log('🔍 Detected audio format:', format);
                
                // Route to appropriate decoder
                if (format === 'wav' || format === 'ogg' || format === 'mp3') {
                  console.log('🎵 Using container decoder for', format);
                  await decodeContainerAndPlay(this.audioContext, audioBytes);
                } else {
                  // Fallback to PCM decoder
                  console.log('🎵 Using PCM decoder');
                  await playAudioData(this.audioContext, audioBytes);
                }
                
                console.log('✅ Audio playback initiated');
              } else {
                console.error('❌ No audio context available!');
              }
            } else if (typeof event.data === 'string') {
              // Handle JSON messages
              const data = JSON.parse(event.data);
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
          const errorMsg = wsError.message || 'WebSocket connection error';
          console.error('Error details:', errorMsg);
          // If first URL failed and not opened yet, try fallback once
          if (!opened && attempt === 0 && urls[1]) {
            attempt = 1;
            console.warn('↩️ Retrying with legacy WS path...');
            tryConnect(urls[1]);
            return;
          }
          this.callbacks.onError?.(errorMsg);
        };

        ws.onclose = (ev) => {
          const e = ev as CloseEvent;
          const reason = e?.reason || '';
          console.log('🔌 WebSocket closed', e?.code, reason);
          this.callbacks.onTrace?.(`WebSocket closed: ${e?.code} ${reason}`);
          
          if (!opened && attempt === 0 && urls[1]) {
            attempt = 1;
            console.warn('↩️ Retrying with legacy WS path after close...');
            tryConnect(urls[1]);
            return;
          }
          
          // If we never got connection_ready, emit error
          if (!this.conversationId) {
            this.callbacks.onError?.(`WebSocket closed before ready (code ${e?.code}${reason ? ': ' + reason : ''})`);
          }
          
          this.callbacks.onConnectionChange?.(false);
          this.isSetupComplete = false;
        };
      };

      // Kick off first attempt
      tryConnect(urls[0]);
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
      console.log('🔌 WebSocket connection ready, conversation ID:', this.conversationId);
      this.callbacks.onTrace?.('Received connection_ready (WebSocket open, waiting for Gemini...)');
      this.callbacks.onConnectionReady?.(); // WebSocket is ready, but not Gemini yet
      // Don't call onConnectionChange(true) yet - wait for Gemini confirmation
      return;
    }

    if (data.type === 'error') {
      console.error('❌ Server error:', data.message);
      this.callbacks.onError?.(data.message);
      return;
    }

    // Handle setup complete - Gemini is ready!
    if (data.setupComplete) {
      this.isSetupComplete = true;
      console.log('🎉 Gemini AI setup complete and ready!');
      this.callbacks.onTrace?.('Gemini setup complete');
      
      // Fire Gemini ready callback (only once)
      if (!this.geminiReadyFired) {
        this.geminiReadyFired = true;
        console.log('🔔 Firing onGeminiReady callback');
        this.callbacks.onGeminiReady?.(); // This will trigger bell and greeting
        this.callbacks.onConnectionChange?.(true); // NOW we're truly connected
      }
      return;
    }

    // Handle server content (AI responses)
    if (data.serverContent) {
      const content = data.serverContent;
      
      // If this is the first model turn and Gemini ready hasn't fired, fire it now
      if (content.modelTurn && !this.geminiReadyFired) {
        this.geminiReadyFired = true;
        console.log('🎉 Gemini responding (first model turn) - firing onGeminiReady');
        this.callbacks.onGeminiReady?.();
        this.callbacks.onConnectionChange?.(true);
      }
      
      if (content.modelTurn) {
        const parts = content.modelTurn.parts || [];
        
        // Handle audio responses with MIME-type detection
        for (const part of parts) {
          if (part.inlineData && part.inlineData.mimeType?.includes('audio')) {
            const mimeType = part.inlineData.mimeType.toLowerCase();
            const audioBase64 = part.inlineData.data;
            const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
            
            console.log('🎵 InlineData audio, MIME:', mimeType, 'Size:', audioBytes.byteLength);
            
            if (this.audioContext) {
              // Resume if needed
              if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
              }
              
              // Route based on MIME type
              if (mimeType.includes('wav') || mimeType.includes('ogg') || 
                  mimeType.includes('opus') || mimeType.includes('mpeg') || 
                  mimeType.includes('mp3')) {
                console.log('🎵 Using container decoder for MIME:', mimeType);
                await decodeContainerAndPlay(this.audioContext, audioBytes);
              } else if (mimeType.includes('pcm') || mimeType.includes('linear16')) {
                console.log('🎵 Using PCM decoder for MIME:', mimeType);
                await playAudioData(this.audioContext, audioBytes);
              } else {
                // Unknown MIME, sniff format
                const format = sniffAudioFormat(audioBytes);
                console.log('🔍 Unknown MIME, sniffed format:', format);
                
                if (format === 'wav' || format === 'ogg' || format === 'mp3') {
                  await decodeContainerAndPlay(this.audioContext, audioBytes);
                } else {
                  await playAudioData(this.audioContext, audioBytes);
                }
              }
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
    this.geminiReadyFired = false; // Reset ready flag
    this.conversationId = null;
    this.callbacks.onConnectionChange?.(false);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isSetupComplete;
  }
}
