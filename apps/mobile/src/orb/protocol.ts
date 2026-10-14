/**
 * VTID-05179 — ORB wire protocol for the native app (N6a, plan Change 2).
 *
 * The native ORB speaks the same protocol as the web widget
 * (vitana-platform `services/gateway/src/frontend/command-hub/orb-widget.js`)
 * against the same gateway routes (`routes/orb-live.ts`). Every constant
 * below carries its widget provenance; NATIVE-CI `orb-parity`
 * (`scripts/native/orb-parity.mjs`) reads the platform sources from `main`
 * and fails when one of them drifts, when the server stops accepting a
 * client type sent here, or when the widget learns a server message this
 * file has not classified.
 *
 * Production safety: nothing in this file opens a connection. Endpoints come
 * from `requireUrl(config, 'gatewayUrl')`, which refuses production and
 * staging hosts (`src/config/env.ts`). Every ORB session writes to the shared
 * production database, so a live session runs only against G1.
 */

/** Audio and timing constants mirrored from the widget (file:line on vitana-platform main). */
export const ORB_AUDIO = {
  /** Capture rate: `sampleRate: 16000` (orb-widget.js:4056); `AUDIO_IN_RATE_HZ` (orb/live/protocol.ts). */
  IN_RATE: 16000,
  /** Playback rate when the mime carries no `rate=` (`_pcmRateFromMime`, :49-61); `AUDIO_OUT_RATE_HZ`. */
  OUT_RATE_DEFAULT: 24000,
  /** `createScriptProcessor(1024, 1, 1)` (:4065): 1024 samples = 64 ms at 16 kHz. */
  FRAME_SAMPLES: 1024,
  /** `_AUDIO_PLAYBACK_RATE` (:32). */
  PLAYBACK_RATE: 1.05,
  /** `_AUDIO_PLAYBACK_RATE_DE` (:41). */
  PLAYBACK_RATE_DE: 1.1,
  /** `_PLAYBACK_LEAD_FIRST_SEC` (:87). */
  LEAD_FIRST_SEC: 0.3,
  /** `_PLAYBACK_LEAD_LATER_SEC` (:88). */
  LEAD_LATER_SEC: 0.05,
  /** Grace before `audioPlaying` turns false after the last source ends (:2239-2245). */
  AUDIO_END_GRACE_MS: 400,
  /** WS / SSE start budget (:2895-2903). */
  START_TIMEOUT_MS: 8000,
  /** Inactivity watchdog (:4743-4750). */
  WATCHDOG_MS: 30000,
  /** `CONTEXT_UPDATE_DEBOUNCE_MS` (:4547). */
  CONTEXT_DEBOUNCE_MS: 250,
  /** `_runNavDirective` drain poll (:5643-5700). */
  NAV_DRAIN_POLL_MS: 300,
  NAV_DRAIN_MAX: 100,
  NAV_GRACE_MS: 200,
  /** Wait for an async host navigation answer (:5690). */
  NAV_RESULT_WAIT_MS: 1500,
  /** `after_speech` safety timer (:3791-3818). */
  AFTER_SPEECH_SAFETY_MS: 15000,
  /** `vad_silence_ms` in the start payload (:2479). */
  VAD_SILENCE_MS: 600,
  /** `recent_routes` cap (useOrbVoiceWidget `RECENT_ROUTES_MAX`). */
  RECENT_ROUTES_MAX: 5,
} as const;

/** `voice_style` of the widget start payload (orb-widget.js:2477): a prompt hint, not a voice selection. */
export const VOICE_STYLE = 'friendly, calm, empathetic';

/** Mime of every outbound audio frame (orb-widget.js:4430). */
export const AUDIO_IN_MIME = 'audio/pcm;rate=16000';

/** Gateway routes, relative to the gateway base URL (no trailing `/api/v1`). */
export const ORB_ROUTES = {
  transport: '/api/v1/orb/live/transport',
  ws: '/api/v1/orb/live/ws',
  sseStart: '/api/v1/orb/live/session/start',
  sseStream: '/api/v1/orb/live/stream',
  sseSend: '/api/v1/orb/live/stream/send',
  sseStop: '/api/v1/orb/live/session/stop',
  audioReady: (sessionId: string) => `/api/v1/orb/session/${encodeURIComponent(sessionId)}/audio-ready`,
  authMe: '/api/v1/auth/me',
} as const;

/**
 * `context_update.app_state.orb_duplex` values (sparring R2-F14). Sent once
 * per session, in the first `context_update` after the server announced
 * `full_duplex` and the effective mode was computed (R2-F15).
 */
export const ORB_DUPLEX = {
  FULL: 'full_duplex',
  HALF_NO_AEC: 'half_duplex:no_aec',
  HALF_IOS16_UNVERIFIED: 'half_duplex:ios16_path_unverified',
} as const;
export type OrbDuplexMode = (typeof ORB_DUPLEX)[keyof typeof ORB_DUPLEX];

// ── Client → server ──────────────────────────────────────────────────────

/** Every type this client sends. Each must be a `case` in `handleWsClientMessage` (orb-live.ts). */
export const CLIENT_MESSAGE_TYPES = [
  'start',
  'audio',
  'interrupt',
  'audio_ready',
  'stop',
  'context_update',
  'nav_result',
  'ping',
] as const;
export type ClientMessageType = (typeof CLIENT_MESSAGE_TYPES)[number];

export type ResponseModality = 'audio' | 'text';

/** F6 start payload. There is deliberately no voice identifier: the server picks persona and voice (rule 42a). */
export interface StartPayload {
  lang: string;
  voice_style: string;
  response_modalities: ResponseModality[];
  vad_silence_ms: number;
  client_timezone?: string;
  current_route?: string;
  surface?: string;
  view_role?: string;
  is_mobile: true;
  recent_routes?: string[];
  app_version?: string;
}

export interface ContextUpdate {
  current_route?: string;
  recent_routes?: string[];
  screen_title?: string;
  app_state?: Record<string, unknown>;
  is_mobile?: boolean;
}

export type NavStatus = 'opened' | 'not_found' | 'refused' | 'error' | 'unknown';

export interface NavResultMessage {
  type: 'nav_result';
  screen_id: string | null;
  route: string | null;
  status: NavStatus | string;
  reason: string | null;
  entry_kind: string;
}

export type ClientMessage =
  | ({ type: 'start' } & StartPayload)
  | { type: 'audio'; data_b64: string; mime: string }
  | { type: 'interrupt' }
  | { type: 'audio_ready' }
  | { type: 'stop' }
  | ({ type: 'context_update' } & ContextUpdate)
  | NavResultMessage
  | { type: 'ping' };

// ── Server → client ──────────────────────────────────────────────────────

/**
 * Server messages the native client acts on (F7). The handshake types
 * (`connected`, `session_started`) are read by the WS transport itself.
 */
export const HANDLED_BY_NATIVE = [
  'connected',
  'session_started',
  'ready',
  'live_api_ready',
  'thinking',
  'audio',
  'audio_out',
  'turn_complete',
  'interrupted',
  'error',
  'connection_alert',
  'reconnecting',
  'reconnected',
  'persona_swap_reconnecting',
  'persona_swap_reconnected',
  'connection_issue',
  'live_api_disconnected',
  'session_ended',
  'session_limit_reached',
  'orb_directive',
  'heartbeat',
  'transcript',
  'output_transcript',
  'input_transcript',
] as const;
export type HandledServerType = (typeof HANDLED_BY_NATIVE)[number];

/** Server messages the widget handles that the native client deliberately ignores, with the reason. */
export const IGNORED_BY_NATIVE: Readonly<Record<string, string>> = {
  prewarm_ready: 'prewarm socket and the prewarm message are N6e',
  link: 'link cards are N6e',
  support_ticket_filed: 'support-report UI is N6e',
};

/** Directives the session runs itself; everything else is surfaced to subscribers. */
export const SESSION_END_DIRECTIVES = ['end_conversation', 'end_teaching_session', 'end_guided_topic_teaching'] as const;

/** `orb_directive` directives ignored in N6, with the reason (plan Change 17). */
export const IGNORED_DIRECTIVE_PREFIXES: Readonly<Record<string, string>> = {
  commerce_setup_: 'commerce setup host events are N6e',
};

export interface OrbDirectiveMessage {
  type: 'orb_directive';
  directive: string;
  route?: string;
  url?: string;
  screen_id?: string;
  reason?: string;
  title?: string;
  entry_kind?: string;
  params?: Record<string, unknown> | null;
  after_speech?: boolean;
  after_turn?: boolean;
  keep_orb_open?: boolean;
}

export interface ServerMessage {
  type: string;
  [key: string]: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────

export interface StartContext {
  lang: string;
  voiceStyle?: string;
  currentRoute?: string;
  surface?: string;
  viewRole?: string;
  recentRoutes?: string[];
  appVersion?: string;
  /** Overridable for tests; defaults to the device time zone. */
  timeZone?: string;
}

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** Builds the F6 start payload. One-shot fields (journey focus, support report, guided topic, reconnect) are N6e. */
export function buildStartPayload(ctx: StartContext): StartPayload {
  const payload: StartPayload = {
    lang: ctx.lang,
    voice_style: ctx.voiceStyle ?? VOICE_STYLE,
    response_modalities: ['audio', 'text'],
    vad_silence_ms: ORB_AUDIO.VAD_SILENCE_MS,
    is_mobile: true,
  };
  const tz = ctx.timeZone ?? deviceTimeZone();
  if (tz) payload.client_timezone = tz;
  if (ctx.currentRoute) payload.current_route = ctx.currentRoute;
  if (ctx.surface) payload.surface = ctx.surface;
  if (ctx.viewRole) payload.view_role = ctx.viewRole;
  if (ctx.recentRoutes && ctx.recentRoutes.length) payload.recent_routes = ctx.recentRoutes.slice(0, ORB_AUDIO.RECENT_ROUTES_MAX);
  if (ctx.appVersion) payload.app_version = ctx.appVersion;
  return payload;
}

/** `_pcmRateFromMime` (orb-widget.js:49-61): the `rate=` of the mime, else 24000. */
export function rateFromMime(mime: unknown): number {
  if (typeof mime !== 'string') return ORB_AUDIO.OUT_RATE_DEFAULT;
  const m = /rate=(\d+)/i.exec(mime);
  const rate = m ? Number(m[1]) : NaN;
  return Number.isFinite(rate) && rate > 0 ? rate : ORB_AUDIO.OUT_RATE_DEFAULT;
}

/** Playback rate for a language (`_currentPlaybackRate`, orb-widget.js:43-47): 1.1 for German, 1.05 otherwise. */
export function playbackRateFor(lang: string): number {
  return lang && lang.startsWith('de') ? ORB_AUDIO.PLAYBACK_RATE_DE : ORB_AUDIO.PLAYBACK_RATE;
}

/** Strips a trailing slash and a trailing `/api/v1` (the routes above add it). */
export function gatewayBase(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

/** True for a message type in neither list (used by the session to log once). */
export function isClassifiedServerType(type: string): boolean {
  return (HANDLED_BY_NATIVE as readonly string[]).includes(type) || type in IGNORED_BY_NATIVE;
}
