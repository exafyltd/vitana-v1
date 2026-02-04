/**
 * OrbVoiceClient - REST + SSE based voice client for the VITANA orb
 * 
 * Architecture:
 * - REST endpoints for session management
 * - SSE for streaming audio/transcripts from AI
 * - AudioWorklet for high-quality 16kHz audio capture
 * - PCM audio queue playback at 24kHz
 */

export type OrbVoiceClientCallbacks = {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onConnectionStateChange?: (state: 'disconnected' | 'connecting' | 'ready') => void;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  onVolumeChange?: (volume: number) => void;
};

export class OrbVoiceClient {
  private sessionId: string | null = null;
  private eventSource: EventSource | null = null;
  private audioContext: AudioContext | null = null;
  private inputContext: AudioContext | null = null;
  private audioQueue: Array<{ data: string; mime: string }> = [];
  private isPlaying = false;
  private lastScheduledEnd: number = 0;  // CRITICAL for seamless playback
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private volumeAnimationFrame: number | null = null;

  // Gateway configuration
  private readonly GATEWAY_URL = 'https://gateway-86804897789.us-central1.run.app';
  private readonly SAMPLE_RATE_IN = 16000;  // Input to gateway
  private readonly SAMPLE_RATE_OUT = 24000; // Output from gateway

  private callbacks: OrbVoiceClientCallbacks;
  private lang: string;

  constructor(
    lang: string = 'de',
    callbacks: OrbVoiceClientCallbacks = {}
  ) {
    this.lang = lang;
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    try {
      this.callbacks.onConnectionStateChange?.('connecting');
      
      // 1. Create session
      const response = await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: this.lang,
          voice_style: 'friendly, calm, empathetic',
          response_modalities: ['audio', 'text']
        })
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to start session');

      this.sessionId = data.session_id;
      console.log('[OrbVoiceClient] Session started:', this.sessionId);

      // 2. Connect to SSE stream
      this.connectSSE();

      // 3. Initialize audio output context
      await this.initAudioOutput();

      // 4. Start recording
      await this.startRecording();

      this.callbacks.onConnectionStateChange?.('ready');
    } catch (err: any) {
      console.error('[OrbVoiceClient] Failed to start:', err);
      this.callbacks.onError?.(err.message || 'Failed to start ORB');
      this.callbacks.onConnectionStateChange?.('disconnected');
      throw err;
    }
  }

  private connectSSE(): void {
    if (!this.sessionId) return;

    const sseUrl = `${this.GATEWAY_URL}/api/v1/orb/live/stream?session_id=${this.sessionId}`;
    console.log('[OrbVoiceClient] Connecting SSE:', sseUrl);
    
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onopen = () => {
      console.log('[OrbVoiceClient] SSE connected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'audio':
            if (msg.data_b64) {
              this.callbacks.onSpeakingChange?.(true);
              this.callbacks.onProcessingChange?.(false);
              this.handleAudioChunk(msg.data_b64);
            }
            break;
          case 'transcript':
            if (msg.text) {
              this.callbacks.onTranscript?.(msg.text);
            }
            break;
          case 'assistant_text':
            if (msg.text) {
              this.callbacks.onTranscript?.(msg.text);
            }
            break;
          case 'error':
            this.callbacks.onError?.(msg.message);
            break;
        }
      } catch (e) {
        console.error('[OrbVoiceClient] Failed to parse SSE message', e);
      }
    };

    this.eventSource.onerror = (error) => {
      console.warn('[OrbVoiceClient] SSE connection issue', error);
    };
  }

  private async initAudioOutput(): Promise<void> {
    // Create AudioContext - use default sample rate for resampling
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.lastScheduledEnd = 0;  // Reset on new context
  }

  private handleAudioChunk(base64: string): void {
    // Queue the chunk with mime type
    this.audioQueue.push({ data: base64, mime: 'audio/pcm;rate=24000' });
    
    // Start playback if not already playing
    if (!this.isPlaying) {
      this.playNextAudio();
    }
  }

  private playNextAudio(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.callbacks.onSpeakingChange?.(false);
      return;
    }

    this.isPlaying = true;
    const chunk = this.audioQueue.shift()!;
    this.playPcmWithScheduling(chunk.data);
  }

  private playPcmWithScheduling(base64Data: string): void {
    try {
      // Decode base64 to bytes
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create AudioContext if needed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.lastScheduledEnd = 0;  // Reset on new context
      }

      const inputSampleRate = this.SAMPLE_RATE_OUT;  // 24kHz PCM from gateway

      // Convert Int16 PCM to Float32 (Web Audio API format)
      const int16Array = new Int16Array(bytes.buffer);
      const floatArray = new Float32Array(int16Array.length);
      for (let j = 0; j < int16Array.length; j++) {
        floatArray[j] = int16Array[j] / 32768.0;  // Normalize to [-1, 1]
      }

      // Create audio buffer at input sample rate
      const audioBuffer = this.audioContext.createBuffer(1, floatArray.length, inputSampleRate);
      audioBuffer.copyToChannel(floatArray, 0);

      // Create buffer source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // When this chunk ends, play next
      source.onended = () => this.playNextAudio();

      // *** THE FIX: Schedule to start exactly when previous chunk ends ***
      const now = this.audioContext.currentTime;
      const nextStartTime = Math.max(now, this.lastScheduledEnd);
      source.start(nextStartTime);

      // Track when this segment will end
      const duration = audioBuffer.duration;
      this.lastScheduledEnd = nextStartTime + duration;

      console.log(`[AUDIO] Scheduled at ${nextStartTime.toFixed(3)}s, duration: ${duration.toFixed(3)}s`);

    } catch (e) {
      console.error('[OrbVoiceClient] PCM playback error:', e);
      this.playNextAudio();  // Continue with next chunk on error
    }
  }

  private async startRecording(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE_IN,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create input context at 16kHz
      this.inputContext = new AudioContext({ sampleRate: this.SAMPLE_RATE_IN });
      const source = this.inputContext.createMediaStreamSource(this.mediaStream);

      // Set up volume analysis
      this.analyserNode = this.inputContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);
      this.startVolumeMonitoring();

      // Load AudioWorklet
      await this.inputContext.audioWorklet.addModule('/audio-processor.js');
      this.workletNode = new AudioWorkletNode(this.inputContext, 'audio-processor');

      this.workletNode.port.onmessage = async (event) => {
        const pcmData = event.data as Float32Array;
        await this.sendAudio(pcmData);
      };

      source.connect(this.workletNode);
      // Keep processor alive by connecting to destination (silent)
      this.workletNode.connect(this.inputContext.destination);

      this.callbacks.onListeningChange?.(true);
      console.log('[OrbVoiceClient] Recording started');
    } catch (e: any) {
      console.error('[OrbVoiceClient] Microphone access denied or error', e);
      this.callbacks.onError?.('Microphone access denied');
      throw e;
    }
  }

  private startVolumeMonitoring(): void {
    if (!this.analyserNode) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const updateVolume = () => {
      if (!this.analyserNode) return;

      this.analyserNode.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedVolume = Math.min(average / 128, 1);

      this.callbacks.onVolumeChange?.(normalizedVolume);
      this.volumeAnimationFrame = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  private async sendAudio(pcmFloat32: Float32Array): Promise<void> {
    if (!this.sessionId) return;

    // Convert Float32 to Int16 PCM
    const int16 = new Int16Array(pcmFloat32.length);
    for (let i = 0; i < pcmFloat32.length; i++) {
      int16[i] = Math.max(-32768, Math.min(32767, pcmFloat32[i] * 32768));
    }

    // Base64 encode
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    try {
      await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          type: 'audio',
          data_b64: base64,
          mime: 'audio/pcm;rate=16000'
        })
      });
    } catch (e) {
      // Silent fail for chunks to avoid log spam
      console.warn('[OrbVoiceClient] Failed to send audio chunk');
    }
  }

  async endTurn(): Promise<void> {
    if (!this.sessionId) return;

    this.callbacks.onListeningChange?.(false);
    this.callbacks.onProcessingChange?.(true);

    try {
      await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/end-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId })
      });
    } catch (e) {
      console.error('[OrbVoiceClient] Failed to end turn', e);
    }
  }

  async sendTextMessage(text: string): Promise<void> {
    if (!this.sessionId) return;

    this.callbacks.onProcessingChange?.(true);

    try {
      await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          type: 'text',
          text: text
        })
      });
    } catch (e) {
      console.error('[OrbVoiceClient] Failed to send text message', e);
      this.callbacks.onError?.('Failed to send message');
    }
  }

  stopListening(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }
    if (this.inputContext) {
      this.inputContext.close();
      this.inputContext = null;
    }
    this.analyserNode = null;
    this.callbacks.onListeningChange?.(false);
    this.callbacks.onVolumeChange?.(0);
  }

  async startListening(): Promise<void> {
    if (this.workletNode) return; // Already listening
    await this.startRecording();
  }

  async stop(): Promise<void> {
    console.log('[OrbVoiceClient] Stopping...');

    // Stop listening first
    this.stopListening();

    // Stop session
    if (this.sessionId) {
      try {
        await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/session/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: this.sessionId })
        });
      } catch (e) {
        console.warn('[OrbVoiceClient] Error stopping session', e);
      }
    }

    // Close SSE
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Close audio output context
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Reset audio state
    this.sessionId = null;
    this.audioQueue = [];
    this.lastScheduledEnd = 0;
    this.isPlaying = false;

    this.callbacks.onConnectionStateChange?.('disconnected');
    this.callbacks.onSpeakingChange?.(false);
    this.callbacks.onProcessingChange?.(false);
    
    console.log('[OrbVoiceClient] Stopped');
  }

  // Getters for state
  get isConnected(): boolean {
    return this.sessionId !== null && this.eventSource !== null;
  }

  get isRecording(): boolean {
    return this.workletNode !== null;
  }
}
