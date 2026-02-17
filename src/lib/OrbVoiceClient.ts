/**
 * OrbVoiceClient - REST + SSE based voice client for the VITANA orb
 * 
 * Architecture:
 * - REST endpoints for session management
 * - SSE for streaming audio/transcripts from AI
 * - CrossPlatformAudioRecorder for iOS-safe audio capture
 * - PCM audio queue playback at 24kHz
 * - JWT-based authentication for multi-tenant voice sessions
 */

import { CrossPlatformAudioRecorder, IS_IOS_SAFARI } from './ios-audio-polyfill';

export type OrbVoiceClientCallbacks = {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onConnectionStateChange?: (state: 'disconnected' | 'connecting' | 'ready') => void;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  onVolumeChange?: (volume: number) => void;
};

export interface OrbVoiceClientConfig {
  lang: string;
  accessToken: string;
}

export class OrbVoiceClient {
  private sessionId: string | null = null;
  private eventSource: EventSource | null = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private recorder: CrossPlatformAudioRecorder | null = null;
  private volumeAnimationFrame: number | null = null;

  // Silence detection for auto end-turn
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private hasSpeechStarted: boolean = false;
  private readonly SILENCE_THRESHOLD = 0.02;
  private readonly SILENCE_DURATION_MS = 1500;

  // Gateway configuration
  private readonly GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || 'https://gateway-q74ibpv6ia-uc.a.run.app';
  private readonly SAMPLE_RATE_IN = 16000;  // Input to gateway
  private readonly SAMPLE_RATE_OUT = 24000; // Output from gateway

  private config: OrbVoiceClientConfig;
  private callbacks: OrbVoiceClientCallbacks;

  constructor(
    config: OrbVoiceClientConfig,
    callbacks: OrbVoiceClientCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Get authorization headers for all API calls
   */
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.accessToken}`,
    };
  }

  async start(): Promise<void> {
    try {
      this.callbacks.onConnectionStateChange?.('connecting');
      
      // 1. Create session with auth
      const response = await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/session/start`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          lang: this.config.lang,
          voice_style: 'friendly, calm, empathetic',
          response_modalities: ['audio', 'text']
        })
      });

      // Handle auth errors
      if (response.status === 401) {
        throw new Error('Session expired - please sign in again');
      }
      if (response.status === 400) {
        const errorData = await response.json();
        if (errorData.error === 'TENANT_REQUIRED') {
          throw new Error('Please select a community first');
        }
        throw new Error(errorData.message || 'Bad request');
      }

      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to start session');

      this.sessionId = data.session_id;
      console.log('[OrbVoiceClient] Session started:', this.sessionId);

      // 2. Connect to SSE stream
      this.connectSSE();

      // 3. Initialize audio output context
      await this.initAudioOutput();

      // 4. Start recording (uses iOS-safe polyfill)
      await this.startRecording();

      this.callbacks.onConnectionStateChange?.('ready');

      // Request welcome greeting from AI
      await this.requestWelcome();
    } catch (err: any) {
      console.error('[OrbVoiceClient] Failed to start:', err);
      this.callbacks.onError?.(err.message || 'Failed to start ORB');
      this.callbacks.onConnectionStateChange?.('disconnected');
      throw err;
    }
  }

  /**
   * Request AI to greet the user when session starts
   */
  private async requestWelcome(): Promise<void> {
    if (!this.sessionId) return;

    console.log('[OrbVoiceClient] Requesting welcome greeting...');
    
    try {
      await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.sessionId,
          type: 'text',
          text: '[system] Session started. Greet the user warmly in their language.'
        })
      });

      await this.endTurn();
    } catch (e) {
      console.warn('[OrbVoiceClient] Failed to request welcome:', e);
    }
  }

  private connectSSE(): void {
    if (!this.sessionId) return;

    const token = encodeURIComponent(this.config.accessToken);
    const sseUrl = `${this.GATEWAY_URL}/api/v1/orb/live/stream?session_id=${this.sessionId}&token=${token}`;
    console.log('[OrbVoiceClient] Connecting SSE:', sseUrl.replace(token, '[REDACTED]'));
    
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
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // iOS requires explicit resume from a user gesture context
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.nextStartTime = 0;
  }

  private handleAudioChunk(base64: string): void {
    if (!this.audioContext) return;
    
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    try {
      // Decode base64 → Int16 → Float32
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      // Create audio buffer at 24kHz
      const buffer = this.audioContext.createBuffer(1, float32.length, this.SAMPLE_RATE_OUT);
      buffer.copyToChannel(float32, 0);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      // Schedule to start exactly when previous ends
      const now = this.audioContext.currentTime;
      if (this.nextStartTime < now) {
        this.nextStartTime = now;
      }
      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;

      this.callbacks.onSpeakingChange?.(true);
      source.onended = () => {
        if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.05) {
          this.callbacks.onSpeakingChange?.(false);
        }
      };
    } catch (e) {
      console.error('[OrbVoiceClient] PCM playback error:', e);
    }
  }

  private async startRecording(): Promise<void> {
    try {
      console.log('[OrbVoiceClient] Starting recording, iOS mode:', IS_IOS_SAFARI);

      this.recorder = new CrossPlatformAudioRecorder(this.SAMPLE_RATE_IN, {
        onAudioData: (pcmFloat32) => {
          this.sendAudio(pcmFloat32);
        }
      });

      await this.recorder.start();

      // Start volume monitoring using the recorder's analyser
      this.startVolumeMonitoring();

      this.callbacks.onListeningChange?.(true);
      console.log('[OrbVoiceClient] Recording started');
    } catch (e: any) {
      console.error('[OrbVoiceClient] Microphone access denied or error', e);
      this.callbacks.onError?.('Microphone access denied');
      throw e;
    }
  }

  private startVolumeMonitoring(): void {
    const analyser = this.recorder?.analyser;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateVolume = () => {
      const currentAnalyser = this.recorder?.analyser;
      if (!currentAnalyser) return;

      currentAnalyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedVolume = Math.min(average / 128, 1);

      this.callbacks.onVolumeChange?.(normalizedVolume);

      // Silence detection for automatic end-turn
      this.detectSilence(normalizedVolume);

      this.volumeAnimationFrame = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  /**
   * Detect silence to automatically end turn after user stops speaking
   */
  private detectSilence(volume: number): void {
    if (volume > this.SILENCE_THRESHOLD) {
      this.hasSpeechStarted = true;
      
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.hasSpeechStarted && !this.silenceTimer) {
      this.silenceTimer = setTimeout(() => {
        console.log('[OrbVoiceClient] Silence detected - ending turn automatically');
        this.endTurn();
        this.hasSpeechStarted = false;
        this.silenceTimer = null;
      }, this.SILENCE_DURATION_MS);
    }
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
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.sessionId,
          type: 'audio',
          data_b64: base64,
          mime: 'audio/pcm;rate=16000'
        })
      });
    } catch (e) {
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
        headers: this.getAuthHeaders(),
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
        headers: this.getAuthHeaders(),
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
    // Clear silence detection timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.hasSpeechStarted = false;

    // Stop the cross-platform recorder
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }

    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }

    this.callbacks.onListeningChange?.(false);
    this.callbacks.onVolumeChange?.(0);
  }

  async startListening(): Promise<void> {
    if (this.recorder?.isRecording) return; // Already listening
    await this.startRecording();
  }

  async stop(): Promise<void> {
    console.log('[OrbVoiceClient] Stopping...');

    // Stop listening first
    this.stopListening();

    // Stop session with auth
    if (this.sessionId) {
      try {
        await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/session/stop`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
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
    this.nextStartTime = 0;

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
    return this.recorder?.isRecording ?? false;
  }
}
