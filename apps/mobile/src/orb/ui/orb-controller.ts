/**
 * VTID-05182 — the ORB overlay's controller (native N6d, plan Changes 15, 16
 * and 18). No React: `OrbProvider` subscribes to it, tests drive it directly.
 *
 * It ties three things together:
 *   - the permission flow (Change 16): tap → if the microphone permission is
 *     undetermined, the in-app rationale → only then the OS prompt; denied →
 *     the "open settings" state. A session never starts without the OS
 *     saying "granted".
 *   - the session (`session.ts`, N6a) over the voice module (N6b / N6c),
 *     with a mute switch in front of the module's frames (the widget's mic
 *     button: while muted no frame is sent, orb-widget.js:4133);
 *   - the context (Change 18): every route change is sent as a debounced
 *     `context_update`; a change of `surface` / `view_role`
 *     (`orbViewProfile(route, role)`) ends an open session and starts a new
 *     one, so the next words come from the right Vitana (web VTID-04561).
 *
 * Production safety: the gateway URL comes from `requireUrl(config,
 * 'gatewayUrl')`, which refuses production and staging hosts; the session
 * checks it again. With no URL (every `development` build without a G1
 * gateway) the overlay says Vitana is not reachable and nothing connects.
 */
import { orbViewProfile } from '@vitana/core/orb-view-profile';
import type { MicPermission } from '../../../modules/vitana-voice/src/VitanaVoice';
import type { TransportKind } from '../transport';
import type { NavCtx, NavResult, OrbSession, OrbSessionDeps, OrbSnapshot } from '../session';
import type { Subscription, VoiceEngine, VoiceFrame } from '../voice-engine';
import { CLOSING_END_REASONS, phaseFromSnapshot, pushRecentRoute, type OrbPhase } from './orb-ui-state';

/** The voice module as the controller uses it: the engine plus the permission calls. */
export interface OrbVoice extends VoiceEngine {
  getMicrophonePermission(): Promise<MicPermission>;
  requestMicrophonePermission(): Promise<MicPermission>;
}

export interface OrbControllerDeps {
  /** `requireUrl(config, 'gatewayUrl')`, or null when the build has none. */
  gatewayUrl: string | null;
  /** Resolved on first use, so a build without the native module never touches it until the FAB is tapped. */
  voice(): OrbVoice;
  createSession(deps: OrbSessionDeps): OrbSession;
  getAccessToken(): Promise<string | null>;
  navigate(route: string, ctx: NavCtx): NavResult | Promise<NavResult>;
  /** The member's language in the web form (`de-DE`), as the widget sends `navigator.language`. */
  lang(): string;
  appVersion: string;
  transportOverride?: TransportKind;
  /** https only (the session filters); `Linking.openURL`. */
  openUrl(url: string): void;
  /** `Linking.openSettings()`. */
  openSettings(): void;
}

export interface OrbUiState {
  open: boolean;
  phase: OrbPhase | null;
  muted: boolean;
  /** The latest assistant transcript, for the accessibility live region only. */
  liveText: string | null;
  snapshot: OrbSnapshot | null;
}

export interface OrbContext {
  route: string;
  role: string | null;
}

export interface OrbController {
  getState(): OrbUiState;
  subscribe(fn: () => void): () => void;
  /** The FAB. */
  open(): Promise<void>;
  /** The close button / Android back. */
  close(): void;
  /** The rationale's "continue": asks the OS. */
  continueRationale(): Promise<void>;
  toggleMute(): void;
  /** After an ended or failed session: start a new one. */
  restart(): Promise<void>;
  openSettings(): void;
  /** Route / role changes (Change 18). */
  setContext(ctx: OrbContext): void;
  dispose(): void;
}

/** A voice engine whose frames stop while muted (nothing is sent, as in the widget). */
export function withMicMute(voice: VoiceEngine): VoiceEngine & { setMuted(muted: boolean): void } {
  let muted = false;
  const wrapped = {
    start: (opts: { leadFirstOnly: boolean; playbackRate: number }) => voice.start(opts),
    stop: () => voice.stop(),
    enqueue: (b64: string, rate: number) => voice.enqueue(b64, rate),
    stopPlayback: () => voice.stopPlayback(),
    setPlaybackRate: (rate: number) => voice.setPlaybackRate(rate),
    getCapabilities: () => voice.getCapabilities(),
    addListener: (event: string, cb: (payload: never) => void): Subscription => {
      if (event !== 'onFrame') return (voice.addListener as (e: string, c: (p: never) => void) => Subscription)(event, cb);
      return voice.addListener('onFrame', (f: VoiceFrame) => {
        if (!muted) (cb as (f: VoiceFrame) => void)(f);
      });
    },
    setMuted: (m: boolean) => {
      muted = m;
    },
  };
  return wrapped as unknown as VoiceEngine & { setMuted(muted: boolean): void };
}

const ACTIVE = new Set(['connecting', 'started', 'greeting', 'listening', 'thinking', 'speaking']);

export function createOrbController(deps: OrbControllerDeps): OrbController {
  const listeners = new Set<() => void>();
  let state: OrbUiState = { open: false, phase: null, muted: false, liveText: null, snapshot: null };
  let session: OrbSession | null = null;
  let unsubscribe: (() => void) | null = null;
  let muteable: (VoiceEngine & { setMuted(m: boolean): void }) | null = null;
  let context: OrbContext = { route: '/', role: null };
  let recent: string[] = [];
  let profileKey = '';
  /** Bumped by close(): a permission answer that arrives after it is ignored. */
  let flow = 0;
  let disposed = false;

  function set(patch: Partial<OrbUiState>): void {
    state = { ...state, ...patch };
    for (const fn of [...listeners]) fn();
  }

  function profile(): { surface: string; view_role: string } {
    return orbViewProfile(context.route, context.role);
  }

  function isActive(): boolean {
    const s = session?.getSnapshot();
    return !!s && ACTIVE.has(s.status);
  }

  function onSnapshot(s: OrbSnapshot): void {
    if (s.status === 'idle' && s.endReason && CLOSING_END_REASONS.includes(s.endReason)) {
      set({ open: false, phase: null, muted: false, snapshot: s });
      muteable?.setMuted(false);
      return;
    }
    const last = [...s.transcripts].reverse().find((x) => x.role === 'assistant');
    const phase = phaseFromSnapshot(s, state.muted);
    set({ snapshot: s, phase: phase ?? state.phase, liveText: last?.text ?? state.liveText });
  }

  function ensureSession(): OrbSession {
    if (session) return session;
    muteable = withMicMute(deps.voice());
    session = deps.createSession({
      gatewayUrl: deps.gatewayUrl as string,
      getAccessToken: deps.getAccessToken,
      voice: muteable,
      navigate: deps.navigate,
      lang: deps.lang,
      appVersion: deps.appVersion,
      transportOverride: deps.transportOverride,
    });
    unsubscribe = session.subscribe((e) => {
      if (e.kind === 'state') onSnapshot(e.snapshot);
      else if (e.kind === 'open_url') deps.openUrl(e.url);
    });
    return session;
  }

  function startSession(): Promise<void> {
    const s = ensureSession();
    muteable?.setMuted(false);
    set({ muted: false, phase: 'connecting', liveText: null });
    const p = profile();
    profileKey = `${p.surface}|${p.view_role}`;
    return s.start({ current_route: context.route, recent_routes: recent, is_mobile: true, surface: p.surface, view_role: p.view_role });
  }

  async function begin(): Promise<void> {
    const my = ++flow;
    if (!deps.gatewayUrl) {
      set({ phase: 'unavailable' });
      return;
    }
    let permission: MicPermission;
    try {
      permission = await deps.voice().getMicrophonePermission();
    } catch {
      permission = { status: 'undetermined', canAskAgain: true };
    }
    if (my !== flow || disposed) return;
    if (permission.status === 'granted') return startSession();
    set({ phase: permission.status === 'denied' && !permission.canAskAgain ? 'denied' : 'rationale' });
  }

  return {
    getState: () => state,

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    async open() {
      if (disposed) return;
      if (state.open && (state.phase === 'rationale' || isActive())) return;
      set({ open: true, phase: null });
      await begin();
    },

    close() {
      flow++;
      if (session && session.getSnapshot().status !== 'idle') session.stop('user');
      muteable?.setMuted(false);
      set({ open: false, phase: null, muted: false, liveText: null });
    },

    async continueRationale() {
      if (state.phase !== 'rationale') return;
      const my = ++flow;
      let permission: MicPermission;
      try {
        permission = await deps.voice().requestMicrophonePermission();
      } catch {
        permission = { status: 'denied', canAskAgain: true };
      }
      if (my !== flow || disposed || !state.open) return;
      if (permission.status === 'granted') return startSession();
      set({ phase: 'denied' });
    },

    toggleMute() {
      if (!isActive()) return;
      const muted = !state.muted;
      muteable?.setMuted(muted);
      const snap = session?.getSnapshot() ?? null;
      set({ muted, phase: snap ? (phaseFromSnapshot(snap, muted) ?? state.phase) : state.phase });
    },

    async restart() {
      if (!state.open || isActive()) return;
      set({ phase: null });
      await begin();
    },

    openSettings() {
      deps.openSettings();
    },

    setContext(ctx) {
      const routeChanged = ctx.route !== context.route;
      context = ctx;
      if (routeChanged) recent = pushRecentRoute(recent, ctx.route);
      if (!session || !isActive()) return;
      const p = profile();
      if (`${p.surface}|${p.view_role}` !== profileKey) {
        // A different Vitana: end this conversation and start one with the new profile.
        session.stop('role_changed');
        void startSession();
        return;
      }
      if (routeChanged) session.updateContext({ current_route: ctx.route, recent_routes: recent, is_mobile: true });
    },

    dispose() {
      disposed = true;
      flow++;
      if (session && session.getSnapshot().status !== 'idle') session.stop('user');
      unsubscribe?.();
      listeners.clear();
    },
  };
}
