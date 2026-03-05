/**
 * OrbVoiceClient - REST + SSE based voice client for the VITANA orb
 * 
 * Architecture:
 * - REST endpoints for session management
 * - SSE for streaming audio/transcripts from AI
 * - CrossPlatformAudioRecorder for iOS-safe audio capture
 * - PCM audio queue playback at 24kHz
 * - JWT-based authentication for multi-tenant voice sessions
 * - Sequential audio upload queue with flush-before-endTurn
 * - SSE readiness gate to prevent race conditions on cross-origin
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

// Session diagnostics for debugging "no speech detected"
interface SessionDiagnostics {
  sessionId: string;
  startedAt: number;
  chunksCapt: number;
  chunksSent: number;
  chunksFailed: number;
  mutedDurationMs: number;
  lastSuccessfulSendAt: number | null;
  endTurnFlushWaitMs: number;
  silentFramesSinceLastSpeech: number;
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

  // Track consecutive send failures to detect broken sessions
  private consecutiveSendErrors: number = 0;
  private readonly MAX_SEND_ERRORS = 5;

  // Explicit internal listening state - gates audio sending
  private _isListening: boolean = false;

  // Sequential audio upload queue
  private audioQueue: string[] = [];
  private isProcessingQueue: boolean = false;
  private readonly MAX_QUEUE_SIZE = 50; // Drop oldest if exceeded

  // No-speech warning timer
  private noSpeechWarningTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly NO_SPEECH_WARNING_MS = 15000; // Warn after 15s of mic active but no speech

  // Muted duration tracking
  private mutedSince: number | null = null;

  // Session diagnostics
  private diagnostics: SessionDiagnostics | null = null;

  // SSE error tracking & reconnection
  private sseConsecutiveErrors: number = 0;
  private readonly MAX_SSE_ERRORS = 3;
  private sseReconnectAttempted: boolean = false;

  // Response timeout after endTurn
  private responseTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly RESPONSE_TIMEOUT_MS = 15000;

  // Speaking-done fallback timer: fires 1.5s after last audio chunk
  private speakingDoneTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SPEAKING_DONE_DELAY_MS = 1500;

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
      
      // Initialize diagnostics
      this.diagnostics = {
        sessionId: this.sessionId!,
        startedAt: Date.now(),
        chunksCapt: 0,
        chunksSent: 0,
        chunksFailed: 0,
        mutedDurationMs: 0,
        lastSuccessfulSendAt: null,
        endTurnFlushWaitMs: 0,
        silentFramesSinceLastSpeech: 0,
      };
      
      console.log('[OrbVoiceClient] Session started:', this.sessionId, 'lang:', this.config.lang);

      // 2. Connect to SSE stream and WAIT for it to be open
      await this.connectSSE();

      // 3. Initialize audio output context
      await this.initAudioOutput();

      // 4. Start recording (uses iOS-safe polyfill)
      await this.startRecording();

      this.callbacks.onConnectionStateChange?.('ready');

      // 5. Request welcome greeting from AI (SSE is guaranteed open now)
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
      const resp = await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.sessionId,
          type: 'text',
          text: '[system] Session started. Greet the user warmly in their language.'
        })
      });

      if (!resp.ok) {
        console.warn('[OrbVoiceClient] Welcome request failed:', resp.status, await resp.text().catch(() => ''));
        // Don't block session — user can still speak first
        return;
      }

      await this.endTurn();
    } catch (e) {
      console.warn('[OrbVoiceClient] Failed to request welcome:', e);
    }
  }

  /**
   * Connect SSE and return a Promise that resolves when the connection is open.
   * Times out after 10s to prevent hanging on failed cross-origin connections.
   */
  private connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.sessionId) {
        reject(new Error('No session ID'));
        return;
      }

      const token = encodeURIComponent(this.config.accessToken);
      const sseUrl = `${this.GATEWAY_URL}/api/v1/orb/live/stream?session_id=${this.sessionId}&token=${token}`;
      console.log('[OrbVoiceClient] Connecting SSE:', sseUrl.replace(token, '[REDACTED]'));
      
      // Timeout for SSE open
      const SSE_OPEN_TIMEOUT_MS = 10000;
      let settled = false;
      
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.error('[OrbVoiceClient] SSE open timeout after', SSE_OPEN_TIMEOUT_MS, 'ms');
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          reject(new Error('SSE connection timeout — check your network'));
        }
      }, SSE_OPEN_TIMEOUT_MS);

      this.eventSource = new EventSource(sseUrl);
      this.sseConsecutiveErrors = 0;
      this.sseReconnectAttempted = false;

      this.eventSource.onopen = () => {
        console.log('[OrbVoiceClient] SSE connected');
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve();
        }
      };

      this.eventSource.onmessage = (event) => {
        // Reset SSE error counter on any successful message
        this.sseConsecutiveErrors = 0;

        try {
          const msg = JSON.parse(event.data);
          this.handleSSEMessage(msg);
        } catch (e) {
          console.error('[OrbVoiceClient] Failed to parse SSE message', e);
        }
      };

      this.eventSource.onerror = (error) => {
        this.sseConsecutiveErrors++;
        console.warn(`[OrbVoiceClient] SSE error (${this.sseConsecutiveErrors}/${this.MAX_SSE_ERRORS})`, error);

        // If SSE never opened, reject the connect promise
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          reject(new Error('SSE connection failed'));
          return;
        }

        // If we exceed max consecutive errors, the session is dead
        if (this.sseConsecutiveErrors >= this.MAX_SSE_ERRORS) {
          console.error('[OrbVoiceClient] SSE dead after', this.MAX_SSE_ERRORS, 'consecutive errors');
          
          if (!this.sseReconnectAttempted) {
            // Try one reconnect
            this.sseReconnectAttempted = true;
            console.log('[OrbVoiceClient] Attempting SSE reconnect...');
            if (this.eventSource) {
              this.eventSource.close();
              this.eventSource = null;
            }
            this.sseConsecutiveErrors = 0;
            // Reconnect without awaiting (fire-and-forget for mid-session)
            this.reconnectSSE();
          } else {
            // Already tried reconnecting — give up
            this.callbacks.onError?.('Voice connection lost — please try again');
            this.callbacks.onConnectionStateChange?.('disconnected');
            this.stop();
          }
        }
      };
    });
  }

  /**
   * Mid-session SSE reconnect (does not re-create the session)
   */
  private reconnectSSE(): void {
    if (!this.sessionId) return;

    const token = encodeURIComponent(this.config.accessToken);
    const sseUrl = `${this.GATEWAY_URL}/api/v1/orb/live/stream?session_id=${this.sessionId}&token=${token}`;
    
    this.eventSource = new EventSource(sseUrl);
    
    this.eventSource.onopen = () => {
      console.log('[OrbVoiceClient] SSE reconnected successfully');
      this.sseConsecutiveErrors = 0;
    };

    this.eventSource.onmessage = (event) => {
      this.sseConsecutiveErrors = 0;
      
      try {
        const msg = JSON.parse(event.data);
        this.handleSSEMessage(msg);
      } catch (e) {
        console.error('[OrbVoiceClient] Failed to parse SSE message', e);
      }
    };

    this.eventSource.onerror = () => {
      this.sseConsecutiveErrors++;
      if (this.sseConsecutiveErrors >= this.MAX_SSE_ERRORS) {
        console.error('[OrbVoiceClient] SSE reconnect also failed — giving up');
        this.callbacks.onError?.('Voice connection lost — please try again');
        this.callbacks.onConnectionStateChange?.('disconnected');
        this.stop();
      }
    };
  }

  /**
   * Start a response timeout timer. If no SSE message arrives within
   * RESPONSE_TIMEOUT_MS after an endTurn, reset isProcessing so
   * auto-resume can kick in.
   */
  private startResponseTimeout(): void {
    this.clearResponseTimeout();
    this.responseTimeoutTimer = setTimeout(() => {
      console.warn('[OrbVoiceClient] Response timeout — no AI response after', this.RESPONSE_TIMEOUT_MS, 'ms');
      this.callbacks.onProcessingChange?.(false);
      // Don't kill the session — just allow user to speak again
    }, this.RESPONSE_TIMEOUT_MS);
  }

  private clearResponseTimeout(): void {
    if (this.responseTimeoutTimer) {
      clearTimeout(this.responseTimeoutTimer);
      this.responseTimeoutTimer = null;
    }
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
          // Gate: only enqueue audio when actively listening (not muted)
          if (!this._isListening) return;
          
          if (this.diagnostics) this.diagnostics.chunksCapt++;
          this.enqueueAudio(pcmFloat32);
        }
      });

      await this.recorder.start();

      this._isListening = true;
      
      // Start volume monitoring using the recorder's analyser
      this.startVolumeMonitoring();
      
      // Start no-speech warning timer
      this.resetNoSpeechWarning();

      this.callbacks.onListeningChange?.(true);
      console.log('[OrbVoiceClient] Recording started');
    } catch (e: any) {
      console.error('[OrbVoiceClient] Microphone access denied or error', e);
      this.callbacks.onError?.('Microphone access denied');
      throw e;
    }
  }

  private startVolumeMonitoring(): void {
    // Cancel any existing loop first
    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }
    
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
      if (this.diagnostics) this.diagnostics.silentFramesSinceLastSpeech = 0;
      
      // Clear no-speech warning since user is speaking
      this.clearNoSpeechWarning();
      
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.hasSpeechStarted && !this.silenceTimer) {
      if (this.diagnostics) this.diagnostics.silentFramesSinceLastSpeech++;
      
      this.silenceTimer = setTimeout(() => {
        console.log('[OrbVoiceClient] Silence detected - ending turn');
        this.stopListening();
        this.endTurn();
        this.hasSpeechStarted = false;
        this.silenceTimer = null;
      }, this.SILENCE_DURATION_MS);
    }
  }

  /**
   * Reset the no-speech warning timer (called when mic becomes active)
   */
  private resetNoSpeechWarning(): void {
    this.clearNoSpeechWarning();
    this.noSpeechWarningTimer = setTimeout(() => {
      // Only warn if still listening and no speech was ever detected
      if (this._isListening && !this.hasSpeechStarted) {
        console.warn('[OrbVoiceClient] No speech detected for', this.NO_SPEECH_WARNING_MS / 1000, 
          's while mic active. Diagnostics:', JSON.stringify(this.diagnostics));
        this.callbacks.onError?.('Microphone active but no speech detected — check mic permissions');
      }
    }, this.NO_SPEECH_WARNING_MS);
  }

  private clearNoSpeechWarning(): void {
    if (this.noSpeechWarningTimer) {
      clearTimeout(this.noSpeechWarningTimer);
      this.noSpeechWarningTimer = null;
    }
  }

  /**
   * Enqueue audio chunk for sequential upload (replaces fire-and-forget)
   */
  private enqueueAudio(pcmFloat32: Float32Array): void {
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

    // Bounded queue: drop oldest if full
    if (this.audioQueue.length >= this.MAX_QUEUE_SIZE) {
      this.audioQueue.shift();
      console.warn('[OrbVoiceClient] Audio queue full, dropping oldest chunk');
    }

    this.audioQueue.push(base64);
    this.processQueue();
  }

  /**
   * Process audio queue sequentially (one chunk at a time)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.audioQueue.length === 0 || !this.sessionId) return;

    this.isProcessingQueue = true;

    while (this.audioQueue.length > 0 && this.sessionId) {
      const base64 = this.audioQueue.shift()!;
      await this.sendAudioChunk(base64);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Send a single audio chunk to the gateway
   */
  private async sendAudioChunk(base64: string): Promise<void> {
    if (!this.sessionId) return;

    try {
      const resp = await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.sessionId,
          type: 'audio',
          data_b64: base64,
          mime: 'audio/pcm;rate=16000'
        })
      });

      if (resp.ok) {
        this.consecutiveSendErrors = 0;
        if (this.diagnostics) {
          this.diagnostics.chunksSent++;
          this.diagnostics.lastSuccessfulSendAt = Date.now();
        }
      } else {
        this.consecutiveSendErrors++;
        if (this.diagnostics) this.diagnostics.chunksFailed++;
        if (this.consecutiveSendErrors === 1) {
          console.warn(`[OrbVoiceClient] Send failed: status=${resp.status}`);
        }
        if (this.consecutiveSendErrors >= this.MAX_SEND_ERRORS) {
          console.error(`[OrbVoiceClient] ${this.consecutiveSendErrors} consecutive send failures (status=${resp.status}) — session broken, stopping`);
          this.logDiagnostics('session_broken_send_errors');
          this.callbacks.onError?.('Voice connection lost — please try again');
          this.stop();
          return;
        }
      }
    } catch (e) {
      this.consecutiveSendErrors++;
      if (this.diagnostics) this.diagnostics.chunksFailed++;
      if (this.consecutiveSendErrors >= this.MAX_SEND_ERRORS) {
        console.error(`[OrbVoiceClient] ${this.consecutiveSendErrors} consecutive send failures (network) — session broken, stopping`);
        this.logDiagnostics('session_broken_network');
        this.callbacks.onError?.('Voice connection lost — please try again');
        this.stop();
        return;
      }
    }
  }

  /**
   * Flush the audio queue - wait for all pending chunks to be sent
   * Returns after queue is empty or timeout
   */
  private async flushQueue(timeoutMs: number = 5000): Promise<void> {
    const start = Date.now();
    
    while (this.audioQueue.length > 0 || this.isProcessingQueue) {
      if (Date.now() - start > timeoutMs) {
        console.warn('[OrbVoiceClient] Flush timeout after', timeoutMs, 'ms, remaining:', this.audioQueue.length);
        this.audioQueue.length = 0; // Clear remaining
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (this.diagnostics) {
      this.diagnostics.endTurnFlushWaitMs = Date.now() - start;
    }
  }

  async endTurn(): Promise<void> {
    if (!this.sessionId) return;

    // Flush pending audio before signaling end-turn
    await this.flushQueue();

    this.callbacks.onProcessingChange?.(true);

    // Start response timeout — if no SSE message arrives, reset isProcessing
    this.startResponseTimeout();

    try {
      const resp = await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/end-turn`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ session_id: this.sessionId })
      });
      
      if (!resp.ok) {
        console.warn('[OrbVoiceClient] end-turn failed:', resp.status);
      }
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
    this._isListening = false;
    this.mutedSince = Date.now();

    // Clear silence detection timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.hasSpeechStarted = false;
    
    // Clear no-speech warning
    this.clearNoSpeechWarning();

    // Soft-mute: disable tracks but keep MediaStream alive
    // (prevents iOS from resetting AVAudioSession routing)
    if (this.recorder) {
      this.recorder.mute();
    }

    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }

    this.callbacks.onListeningChange?.(false);
    this.callbacks.onVolumeChange?.(0);
  }

  async startListening(): Promise<void> {
    // If recorder exists and is soft-muted, just unmute (avoids new getUserMedia → iOS route switch)
    if (this.recorder && this.recorder.isMuted) {
      this.recorder.unmute();
      this._isListening = true;
      
      // Track muted duration
      if (this.mutedSince && this.diagnostics) {
        this.diagnostics.mutedDurationMs += Date.now() - this.mutedSince;
        this.mutedSince = null;
      }

      // CRITICAL FIX: Restart volume monitoring after unmute
      // Without this, VAD/silence detection stops working after mute/unmute cycles
      this.startVolumeMonitoring();
      
      // Restart no-speech warning
      this.resetNoSpeechWarning();
      
      this.callbacks.onListeningChange?.(true);
      return;
    }
    if (this.recorder) return; // Already actively recording
    await this.startRecording();
  }

  /**
   * Log session diagnostics for debugging
   */
  private logDiagnostics(reason: string): void {
    if (!this.diagnostics) return;
    const elapsed = Date.now() - this.diagnostics.startedAt;
    console.log(`[OrbVoiceClient] DIAGNOSTICS (${reason}):`, {
      ...this.diagnostics,
      elapsedMs: elapsed,
      sendRate: this.diagnostics.chunksSent / (elapsed / 1000),
      failRate: this.diagnostics.chunksFailed / Math.max(1, this.diagnostics.chunksSent + this.diagnostics.chunksFailed),
    });
  }

  async stop(): Promise<void> {
    console.log('[OrbVoiceClient] Stopping...');
    
    // Log final diagnostics
    this.logDiagnostics('session_stop');

    this._isListening = false;

    // Clear response timeout
    this.clearResponseTimeout();

    // Clear silence detection
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.hasSpeechStarted = false;
    
    // Clear no-speech warning
    this.clearNoSpeechWarning();

    // Cancel volume monitoring
    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }

    // Clear audio queue
    this.audioQueue.length = 0;
    this.isProcessingQueue = false;

    // Full recorder teardown — only place where MediaStream is destroyed
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }

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
    this.diagnostics = null;

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
