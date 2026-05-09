import { AudioRecorder, ScreenRecorder, CameraRecorder, encodeAudioForVertex, playAudioData, clearAudioQueue, decodeContainerAndPlay, sniffAudioFormat } from '@/utils/vertexAudio';

export interface VertexLiveCallbacks {
  onConnectionChange?: (connected: boolean) => void;
  onConnectionReady?: () => void; // Triggered when WebSocket opens
  onGeminiReady?: () => void; // NEW: Triggered when Gemini AI confirms it's ready
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onTrace?: (message: string) => void;
  onResponseComplete?: () => void; // NEW: Triggered when TTS turn completes
}

export class VertexLiveService {
  private ws: WebSocket | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private screenRecorder: ScreenRecorder | null = null;
  private cameraRecorder: CameraRecorder | null = null;
  private cameraStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private callbacks: VertexLiveCallbacks = {};
  private conversationId: string | null = null;
  private isSetupComplete = false;
  private geminiReadyFired = false; // NEW: Track if we've fired onGeminiReady
  private isIntentionalDisconnect = false; // Track intentional disconnects to prevent false errors
  // Per-turn playback buffer (force PCM path, single play per turn)
  private turnChunks: Uint8Array[] = [];
  private collectingTurn = false;
  // Heartbeat management
  private heartbeatInterval: number | null = null;
  private lastPongReceived: number = Date.now();
  // Audio scheduling to prevent gaps between chunks
  private lastScheduledEndTime: number = 0;

  constructor(callbacks: VertexLiveCallbacks) {
    this.callbacks = callbacks;
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
          
          // Start heartbeat to prevent abnormal closures (code 1006)
          this.heartbeatInterval = window.setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'ping' }));
              
              // Check if last pong was too long ago (>60s = connection issues)
              if (Date.now() - this.lastPongReceived > 60000) {
                console.warn('⚠️ No pong received for 60s, connection may be stale');
              }
            }
          }, 30000); // Ping every 30 seconds
        };

        ws.onmessage = async (event) => {
          try {
            // Enhanced logging: log EVERY message for debugging
            if (event.data instanceof ArrayBuffer) {
              console.log('📥 Message received: ArrayBuffer,', event.data.byteLength, 'bytes');
            } else if (typeof event.data === 'string') {
              const preview = event.data.length > 100 ? event.data.substring(0, 100) + '...' : event.data;
              console.log('📥 Message received: JSON -', preview);
            } else {
              console.log('📥 Message received:', typeof event.data);
            }
            
            // CHECKPOINT B: Verify binary frame type
            console.log('📥 Binary frame check:', typeof event.data, 'instanceof ArrayBuffer:', event.data instanceof ArrayBuffer);
            
            // Check if this is binary audio data or JSON
            if (event.data instanceof ArrayBuffer) {
              // Handle binary audio data - WebSocket binary frames are ALWAYS raw PCM from Gemini
              console.log('📥 Received audio ArrayBuffer, size:', event.data.byteLength);
              const audioBytes = new Uint8Array(event.data);
              
              // Enhanced diagnostic logging
              if (audioBytes.length >= 8) {
                const first8 = Array.from(audioBytes.slice(0, 8))
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join(' ');
                console.log('🔍 First 8 bytes (hex):', first8);
                
                // Check for WAV header (should NOT be present)
                const hasRIFF = audioBytes[0] === 0x52 && audioBytes[1] === 0x49 && 
                                audioBytes[2] === 0x46 && audioBytes[3] === 0x46;
                if (hasRIFF) {
                  console.error('❌ UNEXPECTED: Received WAV container! Should be raw PCM.');
                } else {
                  console.log('✅ Confirmed: Raw PCM data (no RIFF header)');
                }
              }
              
              if (this.audioContext) {
                // Resume audio context if suspended (browser autoplay policy)
                if (this.audioContext.state === 'suspended') {
                  await this.audioContext.resume();
                  console.log('▶️ Resumed audio context');
                }
                
                // WebSocket binary frames are ALWAYS raw PCM16 @ 24kHz from Gemini
                // Never sniff format here - sniffing causes false MP3 detection
                console.log('🎵 Streaming binary: forcing PCM path (no sniffing)');
                
                // Guard: must be 16-bit aligned
                if ((audioBytes.byteLength & 1) !== 0) {
                  console.error('❌ PCM not 16-bit aligned. Dropping frame length=', audioBytes.byteLength);
                  return;
                }
                
                // CHECKPOINT B: Collect for per-turn playback
                if (!this.collectingTurn) {
                  this.collectingTurn = true;
                  this.turnChunks = [];
                }
                this.turnChunks.push(audioBytes);
                console.log('🔊 Collected chunk for turn:', audioBytes.byteLength, 'bytes', 'Total chunks:', this.turnChunks.length);
                // NOTE: No per-chunk playback here; we'll play once at turnComplete
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
          
          // Clear heartbeat
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }
          
          // If this was an intentional disconnect, don't treat it as an error
          if (this.isIntentionalDisconnect) {
            console.log('✅ Intentional disconnect - no error');
            this.callbacks.onConnectionChange?.(false);
            this.isSetupComplete = false;
            return;
          }
          
          // Code 1006 before connection_ready: try fallback URL even if onopen fired
          if (e?.code === 1006 && !this.conversationId && attempt === 0 && urls[1]) {
            attempt = 1;
            console.warn('↩️ Code 1006 before ready, retrying with fallback URL...');
            this.callbacks.onTrace?.('Reconnecting via fallback path...');
            tryConnect(urls[1]);
            return;
          }
          
          // Regular fallback for non-opened connections
          if (!opened && attempt === 0 && urls[1]) {
            attempt = 1;
            console.warn('↩️ Retrying with legacy WS path after close...');
            tryConnect(urls[1]);
            return;
          }
          
          // If we never got connection_ready, emit error
          if (!this.conversationId) {
            const errorMsg = e?.code === 1006 
              ? 'Connection closed unexpectedly before ready (1006). Retrying...'
              : `WebSocket closed before ready (code ${e?.code}${reason ? ': ' + reason : ''})`;
            this.callbacks.onError?.(errorMsg);
          } else if (e?.code === 1006 && !this.isIntentionalDisconnect) {
            // Code 1006 after established connection
            console.warn('⚠️ WebSocket abnormal closure (1006) - connection lost unexpectedly');
            this.callbacks.onError?.('Connection lost — tap to reconnect.');
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

    // Handle pong response to heartbeat
    if (data.type === 'pong') {
      this.lastPongReceived = Date.now();
      return;
    }

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
      
      // Send ACK back to server to stop retries
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('📤 Sending setupComplete ACK to server');
        this.ws.send(JSON.stringify({ type: 'setupComplete_ack' }));
      }
      
      // Fire Gemini ready callback (only once)
      if (!this.geminiReadyFired) {
        this.geminiReadyFired = true;
        console.log('🔔 Firing onGeminiReady callback (via setupComplete)');
        this.callbacks.onGeminiReady?.(); // This will trigger bell and greeting
        this.callbacks.onConnectionChange?.(true); // NOW we're truly connected
      }
      return;
    }

    // Handle server content (AI responses)
    if (data.serverContent) {
      const content = data.serverContent;
      
      // AGGRESSIVE FALLBACK: Fire ready on ANY Gemini response if not already fired
      if (!this.geminiReadyFired) {
        this.geminiReadyFired = true;
        console.log('🎉 Gemini responding (fallback detection) - firing onGeminiReady');
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
        console.log('🏁 Turn complete, playing per-turn buffer + flushing audio queue');
        
        // Per-turn playback (single AudioBufferSource)
        await this.playTurnBuffer();
        
        // Also flush any queue-based preview path if used elsewhere
        const { flushAudioQueue } = await import('@/utils/vertexAudio');
        await flushAudioQueue();
        
        // Fire response complete callback
        this.callbacks.onResponseComplete?.();
        
        // Reset for next turn
        this.collectingTurn = false;
        this.turnChunks = [];
        // recorder.startTurn();
      }
    }
  }

  // Play accumulated PCM16 chunks as a single AudioBufferSource
  // FIX: Schedule sequential playback to eliminate gaps between turns
  private async playTurnBuffer() {
    try {
      if (!this.audioContext) return;
      const total = this.turnChunks.reduce((s, c) => s + c.length, 0);
      if (total === 0) return;
      const pcm = new Uint8Array(total);
      let off = 0;
      for (const c of this.turnChunks) { pcm.set(c, off); off += c.length; }
      if ((pcm.byteLength & 1) !== 0) {
        console.error('❌ Odd-length turn buffer, dropping:', pcm.byteLength);
        return;
      }
      const dv = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
      const frames = pcm.byteLength >> 1;
      const f32 = new Float32Array(frames);
      for (let i = 0, o = 0; i < frames; i++, o += 2) f32[i] = dv.getInt16(o, true) / 32768;

      const buf = this.audioContext.createBuffer(1, frames, 24000);
      buf.copyToChannel(f32, 0);
      const src = this.audioContext.createBufferSource();
      src.buffer = buf;
      src.connect(this.audioContext.destination);

      // Schedule playback to start immediately after previous chunk ends
      // This eliminates gaps between consecutive audio turns
      const now = this.audioContext.currentTime;
      const nextStartTime = Math.max(now, this.lastScheduledEndTime);
      src.start(nextStartTime);

      // Track when this segment will end for next scheduling
      const duration = buf.duration;
      this.lastScheduledEndTime = nextStartTime + duration;

      console.log(`▶️ Scheduled playback at ${nextStartTime.toFixed(3)}s (now: ${now.toFixed(3)}s), duration: ${duration.toFixed(3)}s, bytes: ${pcm.byteLength}, frames: ${frames}`);
    } catch (e) {
      console.error('Per-turn playback error:', e);
    }
  }

  async startAudio() {
    if (this.audioRecorder) {
      console.warn('🎤 Mic already recording, ignoring startAudio');
      return;
    }

    // Wait for setup completion (up to 30s)
    if (!this.isSetupComplete) {
      console.log('⏳ Waiting for Gemini setup to complete before starting mic...');
      const startTime = Date.now();
      while (!this.isSetupComplete) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (Date.now() - startTime > 30000) {
          throw new Error('Gemini setup timeout - could not start microphone');
        }
      }
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
    console.log('✅ Audio recording started successfully');
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
    
    // Capture screen stream separately so we can control audio
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({ 
      video: true, 
      audio: true 
    });
    
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
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
  }

  async startCamera() {
    // Remove internal wait - rely on outer gating in useVertexLive
    console.log('📹 Starting camera...');
    
    // Capture camera stream
    this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    let firstFrameSent = false;
    
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
      
      // First frame confirmation - consider camera ready (fallback)
      if (!firstFrameSent) {
        firstFrameSent = true;
        console.log('✅ First camera frame sent successfully');
        
        // If setupComplete hasn't fired yet, fire it now as fallback
        if (!this.isSetupComplete) {
          console.log('📹 Camera frame sent - marking Gemini as ready (fallback)');
          this.isSetupComplete = true;
          this.callbacks.onGeminiReady?.();
        }
      }
    });

    await this.cameraRecorder.start();
    console.log('📹 Camera recorder started, capturing frames at 1 FPS');
  }

  stopCamera() {
    console.log('🛑 Stopping camera...');
    
    if (this.cameraRecorder) {
      this.cameraRecorder.stop();
      this.cameraRecorder = null;
    }
    
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
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

  sendVideoFrame(frameData: string, mimeType: string = "image/jpeg") {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot send video frame');
      return;
    }

    if (!this.isSetupComplete) {
      console.warn('⚠️ Setup not complete, cannot send video frame');
      return;
    }

    // Send video frame to Vertex AI (same format as camera)
    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType,
          data: frameData  // base64 encoded JPEG
        }]
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    console.log('🔌 Disconnecting from Vertex AI...');

    // Mark as intentional disconnect to prevent false errors
    this.isIntentionalDisconnect = true;

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
    this.geminiReadyFired = false;
    this.conversationId = null;
    this.lastScheduledEndTime = 0; // Reset audio scheduling for clean reconnect
    
    // Reset flag after a short delay to allow close handler to see it
    setTimeout(() => {
      this.isIntentionalDisconnect = false;
    }, 100);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isSetupComplete;
  }
  
  setCameraAudioEnabled(enabled: boolean) {
    if (this.cameraStream) {
      this.cameraStream.getAudioTracks().forEach(t => t.enabled = enabled);
      console.log(`📹 Camera audio ${enabled ? 'enabled' : 'muted'}`);
    }
  }
  
  setScreenAudioEnabled(enabled: boolean) {
    if (this.screenStream) {
      this.screenStream.getAudioTracks().forEach(t => t.enabled = enabled);
      console.log(`🖥️ Screen audio ${enabled ? 'enabled' : 'muted'}`);
    }
  }
  
  hasCameraAudioTrack(): boolean {
    return (this.cameraStream?.getAudioTracks().length ?? 0) > 0;
  }
  
  hasScreenAudioTrack(): boolean {
    return (this.screenStream?.getAudioTracks().length ?? 0) > 0;
  }
}
