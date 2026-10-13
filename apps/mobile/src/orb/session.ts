/**
 * VTID-05179 — the ORB session state machine, without React (N6a, Change 4).
 *
 *   idle → connecting → started → greeting → listening | thinking | speaking → ending → idle
 *
 * A `generation` counter makes every stale timer and late network answer a
 * no-op once the session it belonged to has ended (widget `_sessionGeneration`).
 *
 * Production safety: `gatewayUrl` is checked with `assertNotProduction` here as
 * well as in `src/config/env.ts` (defence in depth). Every ORB session writes
 * to the shared production database (OASIS events for every session, memory
 * and continuity for signed-in ones), so no build ever opens one against
 * staging or production; live sessions run on G1 only, tests use the local
 * fake gateway (`apps/mobile/tools/orb-fake-gateway`).
 *
 * Anonymous sessions are not started in N6 (pre-login voice is N6e).
 */
import { assertNotProduction } from '../config/env';
import { AudioPipeline, resolveDuplexMode } from './duplex-gate';
import {
  AUDIO_IN_MIME,
  HANDLED_BY_NATIVE,
  IGNORED_BY_NATIVE,
  IGNORED_DIRECTIVE_PREFIXES,
  ORB_AUDIO,
  ORB_ROUTES,
  SESSION_END_DIRECTIVES,
  buildStartPayload,
  gatewayBase,
  playbackRateFor,
  rateFromMime,
  type ContextUpdate,
  type NavStatus,
  type OrbDirectiveMessage,
  type OrbDuplexMode,
  type ServerMessage,
} from './protocol';
import { latchSse, selectTransport } from './select-transport';
import { OrbStartError, defaultFetch, type FetchLike, type OrbTransport, type TransportKind } from './transport';
import { createSseTransport, type XhrFactory } from './transport-sse';
import { createWsTransport, type WebSocketCtor } from './transport-ws';
import type { Subscription, VoiceCapabilities, VoiceEngine } from './voice-engine';

export type OrbStatus = 'idle' | 'connecting' | 'started' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'ending';

export type OrbEndReason =
  | 'user'
  | 'no_token'
  | 'auth_rejected'
  | 'start_rejected'
  | 'start_failed'
  | 'watchdog'
  | 'interruption'
  | 'background'
  | 'navigate'
  | 'end_directive'
  | 'transport_closed'
  | 'session_ended'
  | 'session_limit_reached'
  | 'connection_issue'
  | 'live_api_disconnected'
  | string;

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
}

export interface NavCtx {
  screen_id?: string;
  reason?: string;
  title?: string;
  entry_kind: string;
  params: Record<string, unknown> | null;
}

export interface NavResult {
  status: NavStatus | string;
  route?: string;
  reason?: string;
}

export interface OrbSnapshot {
  status: OrbStatus;
  endReason: OrbEndReason | null;
  reconnecting: boolean;
  lastError: string | null;
  transport: TransportKind | null;
  sessionId: string | null;
  fullDuplex: boolean;
  duplexMode: OrbDuplexMode | null;
  transcripts: TranscriptEntry[];
}

export type OrbEvent =
  | { kind: 'state'; snapshot: OrbSnapshot }
  /** `orb_directive open_url` (https only); N6d opens it with `Linking.openURL`. */
  | { kind: 'open_url'; url: string }
  | { kind: 'route_change'; output: string; reason: string };

export interface OrbStartContext extends ContextUpdate {
  surface?: string;
  view_role?: string;
}

export interface OrbSessionDeps {
  /** From `requireUrl(config, 'gatewayUrl')`; checked again here. */
  gatewayUrl: string;
  getAccessToken(): Promise<string | null>;
  voice: VoiceEngine;
  navigate: (route: string, ctx: NavCtx) => NavResult | Promise<NavResult>;
  lang(): string;
  appVersion: string;
  now?: () => number;
  /** Injectables (tests, dev profile). */
  fetchImpl?: FetchLike;
  WebSocketImpl?: WebSocketCtor;
  xhrFactory?: XhrFactory;
  transportOverride?: TransportKind;
  startTimeoutMs?: number;
}

export interface OrbSession {
  start(ctx?: OrbStartContext): Promise<void>;
  stop(reason?: OrbEndReason): void;
  updateContext(ctx: ContextUpdate): void;
  subscribe(fn: (e: OrbEvent) => void): () => void;
  getSnapshot(): OrbSnapshot;
}

const TRANSCRIPT_MAX = 50;
const ENDING_TYPES = new Set(['session_ended', 'session_limit_reached', 'connection_issue', 'live_api_disconnected']);

export function createOrbSession(deps: OrbSessionDeps): OrbSession {
  const base = gatewayBase(assertNotProduction(deps.gatewayUrl));
  const now = deps.now ?? (() => Date.now());
  const doFetch = deps.fetchImpl ?? defaultFetch();
  const listeners = new Set<(e: OrbEvent) => void>();

  let generation = 0;
  let navCancel = 0;
  let snapshot: OrbSnapshot = initialSnapshot();
  let transport: OrbTransport | null = null;
  let pipeline: AudioPipeline | null = null;
  let subs: Subscription[] = [];
  let capabilities: VoiceCapabilities | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let contextTimer: ReturnType<typeof setTimeout> | null = null;
  let afterSpeechTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingNav: OrbDirectiveMessage | null = null;
  let turnCompleted = false;
  let duplexReported = false;
  let lastContextKey: string | null = null;
  let context: ContextUpdate = {};
  const timers = new Set<ReturnType<typeof setTimeout>>();

  function initialSnapshot(): OrbSnapshot {
    return {
      status: 'idle',
      endReason: null,
      reconnecting: false,
      lastError: null,
      transport: null,
      sessionId: null,
      fullDuplex: false,
      duplexMode: null,
      transcripts: [],
    };
  }

  function emit(e: OrbEvent): void {
    for (const fn of listeners) {
      try {
        fn(e);
      } catch {
        /* a listener never breaks the session */
      }
    }
  }

  function set(patch: Partial<OrbSnapshot>): void {
    snapshot = { ...snapshot, ...patch };
    emit({ kind: 'state', snapshot });
  }

  function later(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  }

  function active(gen: number): boolean {
    return gen === generation && snapshot.status !== 'idle' && snapshot.status !== 'ending';
  }

  function armWatchdog(gen: number): void {
    if (watchdog) clearTimeout(watchdog);
    watchdog = later(() => {
      if (active(gen)) end('watchdog');
    }, ORB_AUDIO.WATCHDOG_MS);
  }

  /** Synchronous audio teardown first, network cleanup without waiting on it. */
  function end(reason: OrbEndReason): void {
    if (snapshot.status === 'idle') return;
    generation++;
    navCancel++;
    pendingNav = null;
    for (const t of timers) clearTimeout(t);
    timers.clear();
    watchdog = contextTimer = afterSpeechTimer = null;
    set({ status: 'ending' });
    try {
      deps.voice.stopPlayback();
    } catch {
      /* noop */
    }
    for (const s of subs) {
      try {
        s.remove();
      } catch {
        /* noop */
      }
    }
    subs = [];
    void deps.voice.stop().catch(() => undefined);
    const t = transport;
    transport = null;
    pipeline = null;
    try {
      t?.close();
    } catch {
      /* noop */
    }
    set({ ...initialSnapshot(), endReason: reason, transcripts: snapshot.transcripts });
  }

  function sendClient(msg: Parameters<OrbTransport['send']>[0]): void {
    transport?.send(msg);
  }

  function applyDuplex(serverFullDuplex: boolean): void {
    if (!pipeline || !capabilities) return;
    const { fullDuplex, mode } = resolveDuplexMode(serverFullDuplex, capabilities);
    pipeline.setFullDuplex(fullDuplex);
    set({ fullDuplex, duplexMode: mode });
    if (!duplexReported && mode) {
      duplexReported = true;
      // R2-F15: the first context_update after full_duplex is known carries the effective mode, once.
      sendClient({ type: 'context_update', ...context, is_mobile: true, app_state: { orb_duplex: mode } });
    }
  }

  function flushContext(gen: number): void {
    contextTimer = null;
    if (!active(gen) || !transport) return;
    const msg = { type: 'context_update' as const, ...context, is_mobile: true };
    const key = JSON.stringify(msg);
    if (key === lastContextKey) return;
    lastContextKey = key;
    sendClient(msg);
  }

  // ── Navigation directives (F8; widget `_runNavDirective`, :5643-5725) ──

  function waitForDrain(gen: number, navGen: number, then: () => void): void {
    let attempts = 0;
    const poll = () => {
      later(() => {
        if (gen !== generation || navGen !== navCancel) return;
        if (pipeline?.isPlaying && attempts++ < ORB_AUDIO.NAV_DRAIN_MAX) {
          poll();
          return;
        }
        later(() => {
          if (gen !== generation || navGen !== navCancel) return;
          then();
        }, ORB_AUDIO.NAV_GRACE_MS);
      }, ORB_AUDIO.NAV_DRAIN_POLL_MS);
    };
    poll();
  }

  function runNav(msg: OrbDirectiveMessage): void {
    const gen = generation;
    const navGen = navCancel;
    const stays = msg.keep_orb_open === true || msg.entry_kind === 'overlay';
    waitForDrain(gen, navGen, () => {
      if (!stays) deps.voice.stopPlayback();
      const ctx: NavCtx = {
        screen_id: msg.screen_id,
        reason: msg.reason,
        title: msg.title,
        entry_kind: msg.entry_kind || 'route',
        params: msg.params || null,
      };
      let done = false;
      const finish = (r: NavResult | null | undefined) => {
        if (done) return;
        done = true;
        if (gen !== generation) return;
        const res = r && typeof r === 'object' ? r : ({} as NavResult);
        sendClient({
          type: 'nav_result',
          screen_id: msg.screen_id || null,
          route: typeof res.route === 'string' ? res.route : msg.route || null,
          status: typeof res.status === 'string' ? res.status : 'unknown',
          reason: typeof res.reason === 'string' ? res.reason.slice(0, 200) : null,
          entry_kind: msg.entry_kind || 'route',
        });
        if (!stays) end('navigate');
      };
      let result: NavResult | Promise<NavResult> | null = null;
      try {
        result = msg.route ? deps.navigate(msg.route, ctx) : { status: 'not_found', reason: 'no_route' };
      } catch (e) {
        result = { status: 'error', reason: String((e as Error)?.message ?? e) };
      }
      if (result && typeof (result as Promise<NavResult>).then === 'function') {
        later(() => finish({ status: 'unknown', reason: 'host did not answer in time' }), ORB_AUDIO.NAV_RESULT_WAIT_MS);
        (result as Promise<NavResult>).then(finish, (e) => finish({ status: 'error', reason: String(e?.message ?? e) }));
      } else {
        finish(result as NavResult);
      }
    });
  }

  function handleDirective(msg: OrbDirectiveMessage): void {
    const d = msg.directive;
    if (d === 'open_url') {
      if (typeof msg.url === 'string' && /^https:\/\//i.test(msg.url)) emit({ kind: 'open_url', url: msg.url });
      return;
    }
    if (d === 'navigate') {
      if (!msg.route && !msg.screen_id) return;
      if (msg.after_speech === true && msg.after_turn !== true) {
        pendingNav = msg;
        if (afterSpeechTimer) clearTimeout(afterSpeechTimer);
        const gen = generation;
        afterSpeechTimer = later(() => {
          if (gen !== generation) return;
          const p = pendingNav;
          pendingNav = null;
          if (p) runNav(p);
        }, ORB_AUDIO.AFTER_SPEECH_SAFETY_MS);
        return;
      }
      pendingNav = null;
      runNav(msg);
      return;
    }
    if ((SESSION_END_DIRECTIVES as readonly string[]).includes(d)) {
      const gen = generation;
      waitForDrain(gen, navCancel, () => end('end_directive'));
      return;
    }
    if (Object.keys(IGNORED_DIRECTIVE_PREFIXES).some((p) => d.startsWith(p))) return;
  }

  // ── Server messages (F7) ──

  function onServerMessage(gen: number, msg: ServerMessage): void {
    if (gen !== generation || !transport) return;
    armWatchdog(gen);
    const type = msg.type;
    if (!(HANDLED_BY_NATIVE as readonly string[]).includes(type) || type in IGNORED_BY_NATIVE) return;
    switch (type) {
      case 'live_api_ready':
        if ('full_duplex' in msg) applyDuplex(msg.full_duplex === true);
        break;
      case 'thinking':
        set({ status: 'thinking' });
        break;
      case 'audio':
      case 'audio_out': {
        const b64 = typeof msg.data_b64 === 'string' ? msg.data_b64 : typeof msg.data === 'string' ? msg.data : null;
        if (b64) deps.voice.enqueue(b64, rateFromMime(msg.mime));
        set({ status: turnCompleted ? 'speaking' : 'greeting' });
        break;
      }
      case 'turn_complete':
        turnCompleted = true;
        pipeline?.onTurnComplete(now());
        if (snapshot.status !== 'speaking' || !pipeline?.isPlaying) set({ status: 'listening' });
        if (pendingNav) {
          const p = pendingNav;
          pendingNav = null;
          if (afterSpeechTimer) clearTimeout(afterSpeechTimer);
          runNav(p);
        }
        break;
      case 'interrupted':
        pipeline?.onServerInterrupted();
        set({ status: 'listening' });
        break;
      case 'error':
        set({ lastError: typeof msg.message === 'string' ? msg.message : typeof msg.code === 'string' ? msg.code : 'error' });
        break;
      case 'connection_alert':
      case 'reconnecting':
      case 'persona_swap_reconnecting':
        set({ reconnecting: true });
        break;
      case 'reconnected':
      case 'persona_swap_reconnected':
        set({ reconnecting: false });
        break;
      case 'orb_directive':
        handleDirective(msg as unknown as OrbDirectiveMessage);
        break;
      case 'transcript':
      case 'output_transcript':
      case 'input_transcript': {
        const text = typeof msg.text === 'string' ? msg.text : '';
        if (text) {
          const role: TranscriptEntry['role'] = type === 'input_transcript' ? 'user' : 'assistant';
          set({ transcripts: [...snapshot.transcripts, { role, text }].slice(-TRANSCRIPT_MAX) });
        }
        break;
      }
      default:
        if (ENDING_TYPES.has(type)) end(type);
        break; // ready, heartbeat, connected, session_started: the watchdog reset above is all
    }
  }

  async function probeToken(token: string): Promise<boolean> {
    try {
      const res = await doFetch(`${base}${ORB_ROUTES.authMe}`, { headers: { Authorization: `Bearer ${token}` } });
      return !(res.status === 401 || res.status === 403);
    } catch {
      return true; // network error: optimistic, as on the web
    }
  }

  async function openTransport(gen: number, token: string, kind: TransportKind): Promise<{ t: OrbTransport; r: Awaited<ReturnType<OrbTransport['start']>> }> {
    const events = {
      onMessage: (m: ServerMessage) => onServerMessage(gen, m),
      onClose: () => {
        if (gen === generation) end('transport_closed');
      },
    };
    const payload = buildStartPayload({
      lang: deps.lang(),
      currentRoute: context.current_route,
      surface: startSurface,
      viewRole: startViewRole,
      recentRoutes: context.recent_routes,
      appVersion: deps.appVersion,
    });
    if (kind === 'ws') {
      const t = createWsTransport({ base, token, events, WebSocketImpl: deps.WebSocketImpl, startTimeoutMs: deps.startTimeoutMs });
      transport = t;
      try {
        return { t, r: await t.start(payload) };
      } catch (e) {
        if (e instanceof OrbStartError && e.kind === 'rejected') throw e;
        latchSse();
        if (gen !== generation) throw e;
      }
    }
    const t = createSseTransport({ base, token, events, fetchImpl: doFetch, xhrFactory: deps.xhrFactory, startTimeoutMs: deps.startTimeoutMs });
    transport = t;
    return { t, r: await t.start(payload) };
  }

  let startSurface: string | undefined;
  let startViewRole: string | undefined;

  return {
    async start(ctx: OrbStartContext = {}): Promise<void> {
      if (snapshot.status !== 'idle') return;
      const gen = ++generation;
      turnCompleted = false;
      duplexReported = false;
      lastContextKey = null;
      pendingNav = null;
      const { surface, view_role, ...rest } = ctx;
      startSurface = surface;
      startViewRole = view_role;
      context = { ...context, ...rest };
      snapshot = { ...initialSnapshot(), status: 'connecting' };
      emit({ kind: 'state', snapshot });

      const token = await deps.getAccessToken().catch(() => null);
      if (gen !== generation) return;
      if (!token) return end('no_token');
      if (!(await probeToken(token))) return gen === generation ? end('auth_rejected') : undefined;
      if (gen !== generation) return;

      capabilities = await deps.voice.getCapabilities();
      if (gen !== generation) return;

      const kind = await selectTransport({ base, fetchImpl: doFetch, override: deps.transportOverride });
      if (gen !== generation) return;

      let opened: Awaited<ReturnType<typeof openTransport>>;
      try {
        opened = await openTransport(gen, token, kind);
      } catch (e) {
        if (gen !== generation) return;
        const rejected = e instanceof OrbStartError && e.kind === 'rejected';
        set({ lastError: String((e as Error)?.message ?? e) });
        return end(rejected ? 'start_rejected' : 'start_failed');
      }
      if (gen !== generation) {
        opened.t.close();
        return;
      }
      const { t, r } = opened;
      pipeline = new AudioPipeline({
        sendAudio: (b64) => t.send({ type: 'audio', data_b64: b64, mime: AUDIO_IN_MIME }),
        sendInterrupt: () => t.send({ type: 'interrupt' }),
        stopPlayback: () => deps.voice.stopPlayback(),
      });
      set({ status: 'started', transport: t.kind, sessionId: r.sessionId });
      const p = pipeline;
      subs = [
        deps.voice.addListener('onFrame', (f) => {
          if (gen === generation) p.onFrame(f);
        }),
        deps.voice.addListener('onPlaybackState', (s) => {
          if (gen !== generation) return;
          p.onPlaybackState(s, now());
          if (!s.playing && snapshot.status === 'speaking') set({ status: 'listening' });
        }),
        deps.voice.addListener('onInterruption', (i) => {
          if (gen === generation && i.kind === 'began') end('interruption');
        }),
        deps.voice.addListener('onBackground', () => {
          if (gen === generation) end('background');
        }),
        deps.voice.addListener('onRouteChange', (rc) => {
          if (gen === generation) emit({ kind: 'route_change', output: rc.output, reason: rc.reason });
        }),
      ];
      armWatchdog(gen);
      try {
        await deps.voice.start({ leadFirstOnly: r.playbackLeadFirstOnly, playbackRate: playbackRateFor(deps.lang()) });
      } catch (e) {
        if (gen === generation) {
          set({ lastError: String((e as Error)?.message ?? e) });
          end('start_failed');
        }
        return;
      }
      if (gen !== generation) return;
      if (r.fullDuplex !== undefined) applyDuplex(r.fullDuplex);
      t.signalAudioReady();
    },

    stop(reason: OrbEndReason = 'user'): void {
      if (snapshot.status === 'idle') {
        generation++;
        return;
      }
      end(reason);
    },

    updateContext(ctx: ContextUpdate): void {
      context = { ...context, ...ctx };
      if (snapshot.status === 'idle' || snapshot.status === 'ending') return;
      const gen = generation;
      if (contextTimer) clearTimeout(contextTimer);
      contextTimer = later(() => flushContext(gen), ORB_AUDIO.CONTEXT_DEBOUNCE_MS);
    },

    subscribe(fn: (e: OrbEvent) => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    getSnapshot(): OrbSnapshot {
      return snapshot;
    },
  };
}
