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
 */

import { CrossPlatformAudioRecorder, IS_IOS_SAFARI } from './ios-audio-polyfill';
import { getOrCreateUnlockedAudioContext } from './iosAudioUnlock';
import { pinIOSLoudspeakerRoute, kickIOSLoudspeakerRoute, releaseIOSLoudspeakerRoute } from './iosAudioRoutePin';
// VTID-02919 (B0d.4-frontend): ORB wake reliability timeline.
import { postWakeTimelineEvent, takePendingWakeClickedAt } from './wakeTimelineClient';

export type OrbVoiceClientCallbacks = {
  onTranscript?: (text: string) => void;
  onLink?: (url: string) => void;
  onError?: (error: string) => void;
  onConnectionStateChange?: (state: 'disconnected' | 'connecting' | 'ready') => void;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  onReconnectingChange?: (isReconnecting: boolean) => void;
  onVolumeChange?: (volume: number) => void;
};

export interface OrbVoiceClientConfig {
  lang: string;
  accessToken: string;
  initialContext?: string;
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
  private activePlaybackSources: Set<AudioBufferSourceNode> = new Set();
  private recorder: CrossPlatformAudioRecorder | null = null;
  private volumeAnimationFrame: number | null = null;
  private turnCompleteTimeout: ReturnType<typeof setTimeout> | null = null;

  // VTID-02919 (B0d.4-frontend): first-audio-out emits exactly once per
  // session. The wake-clicked timestamp is captured in module state by
  // captureWakeClickedAt() inside the user-gesture handler and replayed
  // here via takePendingWakeClickedAt() after session-start returns.
  private firstAudioEmitted: boolean = false;
  // meta.wake_brief from /live/session/start. Stored for downstream
  // consumers (e.g. a future slice that speaks the backend-provided line).
  private wakeBrief: {
    decision_id: string;
    selected_kind: string;
    user_facing_line: string;
    suppression_reason: string | null;
  } | null = null;

  // Silence detection for auto end-turn
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private hasSpeechStarted: boolean = false;
  private readonly SILENCE_THRESHOLD = 0.02;
  private readonly SILENCE_DURATION_MS = 1500;
  private readonly TURN_COMPLETE_FALLBACK_MS = 2000; // If no turn_complete event after last audio, auto-complete

  // Track consecutive send failures to detect broken sessions
  private consecutiveSendErrors: number = 0;
  private readonly MAX_SEND_ERRORS = 5;

  // Explicit internal listening state - gates audio sending
  private _isListening: boolean = false;

  // Reconnect tracking — keeps UI in sync with real WS state
  private _isReconnecting: boolean = false;
  private _wasListeningBeforeReconnect: boolean = false;

  // VTID-02637: SSE drop grace period. iOS Safari fires `onerror` on every
  // brief network blip but the EventSource often re-opens within 1-2 s
  // without any user-visible disruption. Schedule the full reconnecting state
  // (mic mute + audio queue drain + spinner) only if the SSE doesn't recover
  // within this window. `null` = no pending grace.
  private _sseGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SSE_GRACE_MS = 3000;

  // VTID-02637: Bounded reconnecting state. If we don't get back to a healthy
  // SSE within this window, force-rebuild the EventSource ourselves rather
  // than waiting forever for the browser. iOS Safari is the worst offender —
  // its EventSource can stay in CLOSED without auto-reopening.
  private _reconnectRebuildTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly RECONNECT_REBUILD_MS = 8000;

  // SSE stream watchdog: if no SSE traffic for STREAM_STALE_MS while we
  // believe we're listening, treat as a silent disconnect and surface it.
  private lastSseMessageAt: number = 0;
  private streamWatchdogInterval: ReturnType<typeof setInterval> | null = null;
  private readonly STREAM_STALE_MS = 20000; // 20s without any SSE message = stale

  // VTID-02637: Page-visibility listener for iOS. Backgrounding Safari kills
  // the EventSource silently; foregrounding does NOT auto-reopen it. Hold
  // the bound handler so we can detach on stop().
  private _visibilityHandler: (() => void) | null = null;

  // Sequential audio upload queue
  private audioQueue: string[] = [];
  private isProcessingQueue: boolean = false;
  private readonly MAX_QUEUE_SIZE = 50; // Drop oldest if exceeded

  // Speaking-state watchdog: if onended for the last queued source never
  // fires (iOS edge cases — context suspended without notice, decode quirk),
  // force-reset isSpeaking so the UI doesn't freeze at "Vitana talking".
  private speakingResetTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SPEAKING_RESET_GUARD_MS = 4000; // ms past last scheduled chunk end

  // No-speech warning timer
  private noSpeechWarningTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly NO_SPEECH_WARNING_MS = 15000; // Warn after 15s of mic active but no speech

  // Muted duration tracking
  private mutedSince: number | null = null;

  // Session diagnostics
  private diagnostics: SessionDiagnostics | null = null;

  // Gateway configuration
  private readonly GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || 'https://gateway-q74ibpv6ia-uc.a.run.app';
  private readonly SAMPLE_RATE_IN = 16000;  // Input to gateway
  private readonly SAMPLE_RATE_OUT = 24000; // Output from gateway

  private config: OrbVoiceClientConfig;
  private callbacks: OrbVoiceClientCallbacks;

  /**
   * VTID-02919 (B0d.4-frontend): expose the wake-brief decision the
   * gateway returned at session-start. Future slices consume this to
   * speak the backend-owned greeting line; B0d.4 only stores it.
   */
  public getWakeBrief() {
    return this.wakeBrief;
  }

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

      // iOS UNLOCK (BOOTSTRAP-ORB-IOS-UNLOCK): Create + unlock the output
      // AudioContext SYNCHRONOUSLY here, while the user gesture that called
      // start() is still active. iOS Safari consumes the gesture at the first
      // await (the fetch below, and later getUserMedia inside startRecording)
      // — after that, creating a new AudioContext or resuming one is
      // unreliable. The silent-buffer play fully unlocks the context so later
      // greeting audio plays on first attempt instead of sitting in the queue.
      this.unlockIosAudio();

      // iOS LOUDSPEAKER PIN: getUserMedia (called inside startRecording below)
      // switches WKWebView's audio session from Playback → PlayAndRecord, which
      // routes output to the earpiece — Vitana goes from loud to quiet partway
      // through the conversation. Starting a silent <audio playsinline> loop
      // synchronously inside the user gesture keeps the route on loudspeaker
      // for the rest of the session. iOS-only; no-op elsewhere.
      pinIOSLoudspeakerRoute();

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

      // VTID-02919 (B0d.4-frontend): capture the wake-brief decision the
      // gateway returned. Stored for downstream consumers; B0d.4 does not
      // yet speak it (measure-before-optimize discipline).
      if (data.meta && data.meta.wake_brief && typeof data.meta.wake_brief === 'object') {
        this.wakeBrief = data.meta.wake_brief;
      }

      // VTID-02919: flush the pending wake_clicked event captured at
      // the user-gesture moment. The POST happens after session-start
      // returns (which is when we have a sessionId), but the `at`
      // timestamp is the original tap moment — time_to_first_audio_ms
      // stays accurate.
      const pendingAt = takePendingWakeClickedAt();
      if (pendingAt && this.sessionId) {
        postWakeTimelineEvent({
          gatewayUrl: this.GATEWAY_URL,
          sessionId: this.sessionId,
          name: 'wake_clicked',
          at: pendingAt,
        });
      }

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

      // 2. Connect to SSE stream
      this.connectSSE();

      // VTID-02637: iOS Safari kills SSE connections silently on
      // background→foreground transitions and does not auto-reopen them.
      // Listen for visibility changes so we can rebuild proactively when
      // the user returns to the tab/app.
      if (typeof document !== 'undefined' && !this._visibilityHandler) {
        this._visibilityHandler = () => {
          if (document.visibilityState === 'visible' && this.sessionId) {
            const stale = !this.eventSource || this.eventSource.readyState !== EventSource.OPEN;
            if (stale) {
              console.warn('[OrbVoiceClient] Returned to foreground with stale SSE — rebuilding');
              this.handleReconnecting();
              this.forceRebuildEventSource();
            }
            // iOS may also have suspended the AudioContext — try to resume.
            if (this.audioContext && this.audioContext.state === 'suspended') {
              this.audioContext.resume().catch((e) => {
                console.warn('[OrbVoiceClient] AudioContext resume on visibility failed:', e);
              });
            }
          }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);
      }

      // 3. Start recording FIRST (uses iOS-safe polyfill)
      // On iOS, getUserMedia reconfigures audio routing to voice-chat mode.
      // If we create the output AudioContext before this, iOS will suspend it.
      await this.startRecording();

      // 4. Initialize audio output context AFTER mic is active
      // This ensures the AudioContext is created after iOS audio routing is settled.
      await this.initAudioOutput();

      this.callbacks.onConnectionStateChange?.('ready');

      // Request welcome greeting from AI
      await this.requestWelcome();
    } catch (err: any) {
      console.error('[OrbVoiceClient] Failed to start:', err);
      // Release the loudspeaker pin we installed at the top of start() so it
      // doesn't outlive a failed session.
      releaseIOSLoudspeakerRoute();
      this.callbacks.onError?.(err.message || 'Failed to start ORB');
      this.callbacks.onConnectionStateChange?.('disconnected');
      throw err;
    }
  }

  /**
   * Request AI to greet the user when session starts.
   * If initialContext is provided, inject it as the first message so
   * the model is aware of the user's memory garden / diary data.
   */
  private async requestWelcome(): Promise<void> {
    if (!this.sessionId) return;

    console.log('[OrbVoiceClient] Requesting welcome greeting...');
    
    try {
      // Inject user context as a hidden system message before the greeting
      if (this.config.initialContext) {
        console.log('[OrbVoiceClient] Injecting user context (' + this.config.initialContext.length + ' chars)');
        await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            session_id: this.sessionId,
            type: 'text',
            text: this.config.initialContext
          })
        });
      }

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
      this.lastSseMessageAt = Date.now();
      // If we were in a reconnecting state because the browser EventSource
      // dropped the connection, clear it on re-open.
      if (this._isReconnecting) {
        this.handleReconnected();
      }
    };

    this.eventSource.onmessage = (event) => {
      // Mark any SSE traffic as liveness — keeps stream watchdog happy.
      this.lastSseMessageAt = Date.now();
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'audio':
            if (msg.data_b64) {
              this.callbacks.onSpeakingChange?.(true);
              this.callbacks.onProcessingChange?.(false);
              this.clearTurnCompleteTimeout();
              this.handleAudioChunk(msg.data_b64);
            }
            break;
          case 'transcript':
            if (msg.text) {
              this.callbacks.onTranscript?.(msg.text);
            }
            break;
          case 'assistant_text':
          case 'output_transcript':
            if (msg.text) {
              this.callbacks.onTranscript?.(msg.text);
            }
            break;
          case 'link':
            if (msg.url) {
              console.log('[OrbVoiceClient] Link received:', msg.url);
              this.callbacks.onLink?.(msg.url);
            }
            break;
          case 'turn_complete':
          case 'turn_end':
          case 'end_of_turn':
            console.log('[OrbVoiceClient] Turn complete received');
            this.handleTurnComplete();
            break;
          case 'reconnecting':
            // Backend is transparently reconnecting the upstream model WS.
            // Pause mic so the user stops talking into the void, and flip UI.
            console.warn('[OrbVoiceClient] Upstream reconnecting — pausing mic', msg);
            this.handleReconnecting();
            break;
          case 'reconnected':
            console.log('[OrbVoiceClient] Upstream reconnected — resuming', msg);
            this.handleReconnected();
            break;
          case 'connection_issue':
          case 'live_api_disconnected':
            // VTID-02637: only surface as a user-visible error when the server
            // says this is terminal (`should_close: true`). When the server
            // sets `should_close: false`, the gateway is mid transparent
            // reconnect and the user shouldn't see anything — they'll get
            // 'reconnected' shortly. Logging it as a soft warning is enough.
            if (msg.should_close) {
              console.error('[OrbVoiceClient] Connection issue from server (terminal)', msg);
              this.callbacks.onError?.(msg.message || 'Voice connection lost');
              this.stop();
            } else {
              console.warn('[OrbVoiceClient] Connection issue from server (transient — server will reconnect)', msg);
              // Make sure UI shows reconnecting so user doesn't keep talking.
              this.handleReconnecting();
            }
            break;
          case 'error':
            this.callbacks.onError?.(msg.message);
            break;
          case 'identity_redirect':
            // VTID-01954: brain detected an identity-mutation intent
            // ("change my name to X" / "Ändere meinen Namen") and emits
            // the redirect_target so we open the right Profile/Settings
            // screen. The brain ALSO speaks the sanctioned refusal via
            // Guardrail B — we just dispatch the deep-link event here.
            // Identity Lock plan: Part 1.5.
            try {
              const target = msg.redirect_target;
              if (target && typeof target.event === 'string' && target.event.startsWith('vitana:open-')) {
                window.dispatchEvent(new CustomEvent(target.event, {
                  detail: target.payload || {},
                }));
                console.log('[VTID-01954] Identity redirect dispatched:', target.event, target.payload);
              }
            } catch (err) {
              console.warn('[VTID-01954] Failed to dispatch identity redirect:', err);
            }
            break;
          default:
            console.log('[OrbVoiceClient] SSE event type:', msg.type);
            break;
        }
      } catch (e) {
        console.error('[OrbVoiceClient] Failed to parse SSE message', e);
      }
    };

    this.eventSource.onerror = (error) => {
      // VTID-02637: iOS Safari fires onerror on every brief blip, including
      // ones that recover in <1s. Entering full `handleReconnecting()`
      // immediately mutes the mic + drains the audio queue, which the user
      // perceives as Vitana cutting them off. Give the EventSource a grace
      // window to self-recover before we flip the UI/audio state.
      const readyState = this.eventSource?.readyState;
      console.warn('[OrbVoiceClient] SSE onerror — readyState=', readyState, error);
      if (readyState === EventSource.CLOSED) {
        // Browser gave up. Skip grace, immediately enter reconnecting and
        // start the rebuild timer.
        this.handleReconnecting();
        return;
      }
      // Otherwise we're CONNECTING (browser auto-retry in flight) — schedule
      // grace. If the connection re-opens, onopen clears it. If not, we go
      // into the full reconnecting state then.
      if (this._sseGraceTimer) clearTimeout(this._sseGraceTimer);
      this._sseGraceTimer = setTimeout(() => {
        this._sseGraceTimer = null;
        if (this.eventSource?.readyState !== EventSource.OPEN) {
          console.warn('[OrbVoiceClient] SSE grace expired — entering reconnecting state');
          this.handleReconnecting();
        }
      }, this.SSE_GRACE_MS);
    };

    // Start stream watchdog — detect silent stalls the server can't signal.
    this.startStreamWatchdog();
  }

  /**
   * Enter reconnecting state: pause mic, flip UI, remember prior listening.
   * Safe to call multiple times — idempotent.
   * VTID-02637: also starts a bounded rebuild timer — if we don't recover
   * within RECONNECT_REBUILD_MS, force-rebuild the EventSource ourselves.
   */
  private handleReconnecting(): void {
    // Cancel any pending grace timer — we're committing to reconnect now.
    if (this._sseGraceTimer) {
      clearTimeout(this._sseGraceTimer);
      this._sseGraceTimer = null;
    }
    if (this._isReconnecting) return;
    this._isReconnecting = true;

    // Remember whether user was actively listening, so we can restore it.
    this._wasListeningBeforeReconnect = this._isListening;

    // Gate audio sending immediately — even if mic keeps capturing, nothing
    // new enters the queue, so we don't pile up chunks during the gap.
    this._isListening = false;
    this.audioQueue.length = 0; // drop any queued chunks — they'd arrive after reconnect
    if (this.recorder && !this.recorder.isMuted) {
      this.recorder.mute();
    }

    this.callbacks.onSpeakingChange?.(false);
    this.callbacks.onProcessingChange?.(false);
    this.callbacks.onListeningChange?.(false);
    this.callbacks.onVolumeChange?.(0);
    this.callbacks.onReconnectingChange?.(true);

    // VTID-02637: bounded rebuild — if reconnect doesn't resolve in time,
    // tear down the dead EventSource and build a fresh one. iOS Safari
    // doesn't always auto-reopen.
    if (this._reconnectRebuildTimer) clearTimeout(this._reconnectRebuildTimer);
    this._reconnectRebuildTimer = setTimeout(() => {
      this._reconnectRebuildTimer = null;
      if (this._isReconnecting) {
        console.warn('[OrbVoiceClient] Reconnect timed out — force-rebuilding EventSource');
        this.forceRebuildEventSource();
      }
    }, this.RECONNECT_REBUILD_MS);
  }

  /**
   * Leave reconnecting state: optionally resume listening if that's where
   * the user was before the drop.
   */
  private handleReconnected(): void {
    if (this._reconnectRebuildTimer) {
      clearTimeout(this._reconnectRebuildTimer);
      this._reconnectRebuildTimer = null;
    }
    if (this._sseGraceTimer) {
      clearTimeout(this._sseGraceTimer);
      this._sseGraceTimer = null;
    }
    if (!this._isReconnecting) return;
    this._isReconnecting = false;
    this.callbacks.onReconnectingChange?.(false);

    // VTID-02715: re-assert the iOS loudspeaker route. iOS sometimes
    // downgrades the audio session to earpiece during a brief connection
    // blip; without this kick, Vitana resumes speaking through the small
    // phone-call speaker (barely audible). Idempotent + iOS-only.
    kickIOSLoudspeakerRoute();

    if (this._wasListeningBeforeReconnect) {
      this._wasListeningBeforeReconnect = false;
      // Resume listening via the normal path (unmutes recorder, restarts VAD).
      this.startListening().catch((e) => {
        console.warn('[OrbVoiceClient] Failed to resume listening after reconnect:', e);
      });
    }
  }

  /**
   * VTID-02637: Tear down a wedged EventSource and build a fresh one. The
   * server-side session is unaffected — same sessionId, same Vertex WS —
   * we just rebuild the SSE pipe to it. iOS Safari occasionally lands in a
   * state where the EventSource is CLOSED but never re-opens; this is the
   * escape hatch.
   */
  private forceRebuildEventSource(): void {
    if (!this.sessionId) return;
    try {
      this.eventSource?.close();
    } catch (_e) { /* ignore */ }
    this.eventSource = null;
    // Treat the rebuild as fresh liveness so the stream watchdog doesn't
    // immediately re-fire while the new connection is in CONNECTING.
    this.lastSseMessageAt = Date.now();
    this.connectSSE();
    // Give the rebuild another window to land before we'd rebuild again.
    if (this._reconnectRebuildTimer) clearTimeout(this._reconnectRebuildTimer);
    this._reconnectRebuildTimer = setTimeout(() => {
      this._reconnectRebuildTimer = null;
      if (this._isReconnecting && this.eventSource?.readyState !== EventSource.OPEN) {
        console.warn('[OrbVoiceClient] Rebuild still not OPEN — rebuilding again');
        this.forceRebuildEventSource();
      }
    }, this.RECONNECT_REBUILD_MS);
  }

  /**
   * Poll for SSE staleness — if no traffic for STREAM_STALE_MS while the
   * session is active, surface a reconnecting state even if the browser
   * EventSource hasn't fired onerror yet (which is common on mobile radio
   * sleep or flaky networks).
   */
  private startStreamWatchdog(): void {
    this.stopStreamWatchdog();
    this.streamWatchdogInterval = setInterval(() => {
      if (!this.sessionId || !this.eventSource) return;
      if (this._isReconnecting) return;
      // Only consider it a stall if we actually expect traffic — i.e. we're
      // listening (mic hot) or the model is mid-turn. An idle session with
      // no activity is normal and shouldn't flip UI.
      if (!this._isListening) return;
      // VTID-02637: if the EventSource is not in OPEN state, the browser is
      // already retrying. Don't double-trigger reconnecting from the watchdog
      // — onerror's grace handler owns that path.
      if (this.eventSource.readyState !== EventSource.OPEN) return;
      const silentFor = Date.now() - this.lastSseMessageAt;
      if (silentFor > this.STREAM_STALE_MS) {
        console.warn(
          `[OrbVoiceClient] SSE silent for ${silentFor}ms while listening on OPEN ES — rebuilding`
        );
        // Skip the full reconnecting state — go straight to rebuild. The SSE
        // is OPEN but receiving nothing, which means the upstream pipe is
        // wedged. Rebuilding bypasses the entire wedged path.
        this.handleReconnecting();
        this.forceRebuildEventSource();
      }
    }, 5000);
  }

  private stopStreamWatchdog(): void {
    if (this.streamWatchdogInterval) {
      clearInterval(this.streamWatchdogInterval);
      this.streamWatchdogInterval = null;
    }
  }

  /**
   * BOOTSTRAP-ORB-IOS-UNLOCK: Synchronous AudioContext creation + silent buffer
   * play inside the user gesture that invoked start(). Must run before any
   * await or iOS Safari will keep the output context suspended and the
   * greeting will play into a dead queue. Safe to call multiple times — reuses
   * an existing open context.
   */
  private unlockIosAudio(): void {
    try {
      // Pull the SHARED AudioContext that was created+unlocked from the live
      // user-gesture in useOrbVoiceClient.connect(), before any await ate the
      // gesture. Creating a fresh AudioContext here would land outside the
      // gesture window on iOS and stay suspended even after resume().
      const shared = getOrCreateUnlockedAudioContext();
      if (shared) {
        this.audioContext = shared;
      } else if (!this.audioContext || (this.audioContext as any).state === 'closed') {
        // Non-browser / unsupported env — best-effort fallback.
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // iOS safety: listen for later suspends (phone call, route change) and
      // auto-resume. Idempotent across start() calls.
      this.audioContext.onstatechange = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          console.log('[OrbVoiceClient] AudioContext suspended — auto-resuming');
          this.audioContext.resume().catch((e) => {
            console.warn('[OrbVoiceClient] AudioContext auto-resume failed:', e);
          });
        }
      };
      console.log('[OrbVoiceClient] iOS audio unlocked, state:', this.audioContext.state, 'sampleRate:', this.audioContext.sampleRate);
    } catch (e) {
      console.warn('[OrbVoiceClient] unlockIosAudio failed:', e);
    }
  }

  private async initAudioOutput(): Promise<void> {
    // BOOTSTRAP-ORB-IOS-UNLOCK: context was unlocked synchronously in the tap
    // handler (useOrbVoiceClient.connect → getOrCreateUnlockedAudioContext).
    // Here we just ensure we still hold a reference to the shared context
    // and that it's running — mic setup may have triggered a route change
    // that suspended it.
    if (!this.audioContext || (this.audioContext as any).state === 'closed') {
      const shared = getOrCreateUnlockedAudioContext();
      if (shared) {
        this.audioContext = shared;
      } else {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.warn('[OrbVoiceClient] initAudioOutput had no pre-unlocked context — creating fresh');
      }
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume().catch((e) => {
        console.warn('[OrbVoiceClient] initAudioOutput resume failed:', e);
      });
    }
    this.nextStartTime = 0;
    console.log('[OrbVoiceClient] Audio output initialized, state:', this.audioContext.state);
  }

  private handleAudioChunk(base64: string): void {
    if (!this.audioContext) return;

    // Best-effort resume (iOS may suspend the context on mic activation /
    // audio route change). Fire-and-forget; do NOT gate playback on the
    // resume promise — when iOS rejects resume() outside a gesture, the
    // chunks would otherwise be silently dropped and the UI would freeze
    // at "Vitana talking" forever. Web Audio queues source.start() against
    // a suspended context safely; once the context resumes (auto-resume on
    // statechange or next gesture), the queued sources will play.
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(e => {
        console.warn('[OrbVoiceClient] AudioContext resume failed:', e);
      });
    }

    this.playPCMChunk(base64);
  }

  private playPCMChunk(base64: string): void {
    if (!this.audioContext) return;

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
      source.onended = () => {
        this.activePlaybackSources.delete(source);
        if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.05) {
          this.callbacks.onSpeakingChange?.(false);
          this.clearSpeakingResetGuard();
          // Schedule turn-complete fallback in case no SSE turn_complete event arrives
          this.scheduleTurnCompleteFallback();
        }
      };

      // Schedule to start exactly when previous ends
      const now = this.audioContext.currentTime;
      if (this.nextStartTime < now) {
        this.nextStartTime = now;
      }
      source.start(this.nextStartTime);
      this.activePlaybackSources.add(source);
      this.nextStartTime += buffer.duration;

      // VTID-02919 (B0d.4-frontend): first audio frame of this session
      // reached the speakers. Emit exactly once per session — the
      // aggregator uses this together with wake_clicked to compute
      // time_to_first_audio_ms.
      if (!this.firstAudioEmitted && this.sessionId) {
        this.firstAudioEmitted = true;
        postWakeTimelineEvent({
          gatewayUrl: this.GATEWAY_URL,
          sessionId: this.sessionId,
          name: 'first_audio_output',
        });
      }

      this.callbacks.onSpeakingChange?.(true);

      // Watchdog: if onended never fires (iOS edge case where the BufferSource
      // is queued against a context that suspends mid-playback or rejects
      // resume silently), force-reset isSpeaking shortly after the last
      // scheduled chunk should have ended. Recomputed on every chunk so it
      // tracks the tail of the queue.
      this.armSpeakingResetGuard();
    } catch (e) {
      console.error('[OrbVoiceClient] PCM playback error:', e);
    }
  }

  private armSpeakingResetGuard(): void {
    if (!this.audioContext) return;
    this.clearSpeakingResetGuard();
    const now = this.audioContext.currentTime;
    const remainingMs = Math.max(0, (this.nextStartTime - now) * 1000);
    this.speakingResetTimer = setTimeout(() => {
      // Only force-reset if onended never reset us. Idempotent.
      this.callbacks.onSpeakingChange?.(false);
      this.scheduleTurnCompleteFallback();
      this.speakingResetTimer = null;
    }, remainingMs + this.SPEAKING_RESET_GUARD_MS);
  }

  private clearSpeakingResetGuard(): void {
    if (this.speakingResetTimer) {
      clearTimeout(this.speakingResetTimer);
      this.speakingResetTimer = null;
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
        const wasReconnecting = this._isReconnecting;
        this.consecutiveSendErrors = 0;
        if (this.diagnostics) {
          this.diagnostics.chunksSent++;
          this.diagnostics.lastSuccessfulSendAt = Date.now();
        }
        // A successful upload after a stretch of failures means we've
        // recovered — leave the reconnecting state so the UI updates.
        if (wasReconnecting) {
          this.handleReconnected();
        }
      } else {
        this.consecutiveSendErrors++;
        if (this.diagnostics) this.diagnostics.chunksFailed++;
        if (this.consecutiveSendErrors === 1) {
          console.warn(`[OrbVoiceClient] Send failed: status=${resp.status}`);
          // Surface the trouble to the UI immediately rather than silently
          // dropping chunks until we cross MAX_SEND_ERRORS (~5–10s of void).
          this.handleReconnecting();
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
      if (this.consecutiveSendErrors === 1) {
        this.handleReconnecting();
      }
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

  /**
   * Handle turn completion — clear processing, re-enable listening
   */
  private handleTurnComplete(): void {
    this.clearTurnCompleteTimeout();
    this.callbacks.onProcessingChange?.(false);
    this.callbacks.onSpeakingChange?.(false);

    // Re-enable listening after AI finishes its turn — unless we're
    // mid-reconnect, where the UI should stay paused until `reconnected`.
    if (this.recorder && !this._isListening && !this._isReconnecting) {
      this.startListening();
    }
  }

  /**
   * Schedule a fallback turn-complete if no SSE event arrives after audio ends
   */
  private scheduleTurnCompleteFallback(): void {
    this.clearTurnCompleteTimeout();
    this.turnCompleteTimeout = setTimeout(() => {
      console.log('[OrbVoiceClient] Turn complete fallback triggered (no SSE event received)');
      this.handleTurnComplete();
    }, this.TURN_COMPLETE_FALLBACK_MS);
  }

  /**
   * Clear the turn-complete fallback timeout
   */
  private clearTurnCompleteTimeout(): void {
    if (this.turnCompleteTimeout) {
      clearTimeout(this.turnCompleteTimeout);
      this.turnCompleteTimeout = null;
    }
  }

  async endTurn(): Promise<void> {
    if (!this.sessionId) return;

    // Flush pending audio before signaling end-turn
    await this.flushQueue();

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

  private closeEventSource(): void {
    if (!this.eventSource) return;

    const source = this.eventSource;
    this.eventSource = null;

    try { source.onopen = null; } catch { /* noop */ }
    try { source.onmessage = null; } catch { /* noop */ }
    try { source.onerror = null; } catch { /* noop */ }
    try { source.close(); } catch { /* noop */ }
  }

  private stopActivePlayback(): void {
    if (this.activePlaybackSources.size === 0) return;

    for (const source of Array.from(this.activePlaybackSources)) {
      try { source.onended = null; } catch { /* noop */ }
      try { source.stop(); } catch { /* already stopped or not started */ }
      try { source.disconnect(); } catch { /* noop */ }
    }

    this.activePlaybackSources.clear();
  }

  private notifyGatewayStop(sessionId: string): void {
    void fetch(`${this.GATEWAY_URL}/api/v1/orb/live/session/stop`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ session_id: sessionId }),
      keepalive: true,
    }).catch((e) => {
      console.warn('[OrbVoiceClient] Error stopping session', e);
    });
  }

  async stop(): Promise<void> {
    console.log('[OrbVoiceClient] Stopping...');
    
    // Log final diagnostics
    this.logDiagnostics('session_stop');

    const stoppedSessionId = this.sessionId;
    this.sessionId = null;
    this._isListening = false;
    this.closeEventSource();
    this.stopActivePlayback();

    // Reset reconnect bookkeeping and stop the stream watchdog.
    this.stopStreamWatchdog();
    if (this._isReconnecting) {
      this._isReconnecting = false;
      this.callbacks.onReconnectingChange?.(false);
    }
    this._wasListeningBeforeReconnect = false;
    // VTID-02637: clear pending grace and rebuild timers
    if (this._sseGraceTimer) { clearTimeout(this._sseGraceTimer); this._sseGraceTimer = null; }
    if (this._reconnectRebuildTimer) { clearTimeout(this._reconnectRebuildTimer); this._reconnectRebuildTimer = null; }
    // VTID-02637: detach the page-visibility listener
    if (this._visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }

    // Clear silence detection
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.clearTurnCompleteTimeout();
    this.clearSpeakingResetGuard();
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

    // Tell the gateway to tear down its side, but do not block local
    // shutdown on network latency. The X button means the browser stops
    // listening and speaking immediately.
    if (stoppedSessionId) {
      this.notifyGatewayStop(stoppedSessionId);
    }

    // Drop our reference to the shared output AudioContext but DO NOT close
    // it — closing the singleton would force the next ORB tap to recreate
    // it, and on iOS the new context would land outside a gesture window
    // (the user's tap calls disconnect+reconnect; only the reconnect side
    // unlocks). Detach the statechange listener we attached in unlockIosAudio.
    if (this.audioContext) {
      try { this.audioContext.onstatechange = null; } catch { /* noop */ }
      this.audioContext = null;
    }

    // Reset audio state
    this.nextStartTime = 0;
    this.diagnostics = null;

    // Release the iOS loudspeaker pin (no-op elsewhere). Refcounted so
    // overlapping start()/stop() calls during reconnects don't tear it
    // down too early.
    releaseIOSLoudspeakerRoute();

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
