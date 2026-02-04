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
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
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
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.SAMPLE_RATE_OUT
    });
  }

  private handleAudioChunk(base64: string): void {
    try {
      // Decode base64 to PCM
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Convert to Float32 (PCM 16-bit signed to float)
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      this.audioQueue.push(float32);
      this.playNextChunk();
    } catch (e) {
      console.error('[OrbVoiceClient] Error handling audio chunk', e);
    }
  }

  private async playNextChunk(): Promise<void> {
    if (this.isPlaying || this.audioQueue.length === 0 || !this.audioContext) return;

    this.isPlaying = true;
    const chunk = this.audioQueue.shift()!;

    try {
      const buffer = this.audioContext.createBuffer(1, chunk.length, this.SAMPLE_RATE_OUT);
      buffer.getChannelData(0).set(chunk);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.onended = () => {
        this.isPlaying = false;
        if (this.audioQueue.length === 0) {
          // All audio finished playing
          this.callbacks.onSpeakingChange?.(false);
        }
        this.playNextChunk();
      };
      source.start();
    } catch (e) {
      console.error('[OrbVoiceClient] Error playing chunk', e);
      this.isPlaying = false;
      this.playNextChunk();
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
      await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'audio',
          session_id: this.sessionId,
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
      await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/end-turn?session_id=${this.sessionId}`, {
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
      await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          session_id: this.sessionId,
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
      this.audioContext.close();
      this.audioContext = null;
    }

    this.sessionId = null;
    this.audioQueue = [];
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
