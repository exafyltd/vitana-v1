/**
 * VTID-05182 — what the ORB overlay shows (native N6d, plan Change 15). Pure.
 *
 * Every caption is an i18n key (plan F10 / Change 20): existing keys are
 * reused where the web already has them (`audio.listening`,
 * `screens.common.vitanaSpeaking`, `screens.ui.microphoneAccessDenied`); the
 * rest are new `orbNative.*` keys written DE-first in du-form. The widget's
 * `_CAPTIONS` literals are never copied. Nothing here is spoken: Vitana's
 * words come only from the gateway's audio (rule 41).
 *
 * The aura colours are the widget's `_AURA` table (orb-widget.js:5025-5033)
 * and the sphere / FAB gradient its `.vtorb-large` / `.vtorb-fab`
 * (:551-557, :671-676).
 */
import type { OrbSnapshot } from '../session';

/** What the overlay is showing. */
export type OrbPhase =
  | 'rationale'
  | 'denied'
  | 'unavailable'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'reconnecting'
  | 'ended'
  | 'error';

export const CAPTION_KEYS: Record<Exclude<OrbPhase, 'rationale'>, string> = {
  denied: 'screens.ui.microphoneAccessDenied',
  unavailable: 'orbNative.status.unavailable',
  connecting: 'orbNative.status.connecting',
  listening: 'audio.listening',
  thinking: 'orbNative.status.thinking',
  speaking: 'screens.common.vitanaSpeaking',
  muted: 'orbNative.status.muted',
  reconnecting: 'orbNative.status.reconnecting',
  ended: 'orbNative.status.ended',
  error: 'audio.connectionError',
};

/** End reasons after which the overlay closes by itself (the member asked, or Vitana moved on). */
export const CLOSING_END_REASONS: readonly string[] = ['user', 'navigate', 'end_directive', 'background'];

/** End reasons shown as a connection problem rather than a plain "ended". */
export const ERROR_END_REASONS: readonly string[] = ['start_failed', 'start_rejected', 'auth_rejected', 'no_token', 'transport_closed', 'connection_issue', 'live_api_disconnected'];

/** The phase for a live session snapshot (null while idle with no end reason). */
export function phaseFromSnapshot(s: OrbSnapshot, muted: boolean): OrbPhase | null {
  if (s.status === 'idle' || s.status === 'ending') {
    if (!s.endReason) return null;
    return ERROR_END_REASONS.includes(s.endReason) ? 'error' : 'ended';
  }
  if (s.reconnecting) return 'reconnecting';
  if (s.status === 'connecting') return 'connecting';
  if (s.status === 'thinking') return 'thinking';
  if (s.status === 'speaking' || s.status === 'greeting') return 'speaking';
  return muted ? 'muted' : 'listening';
}

export type Aura = { inner: string; innerOpacity: number; outer: string | null; outerOpacity: number };

const AURA: Record<string, Aura> = {
  connecting: { inner: 'rgba(226,232,240,0.4)', innerOpacity: 0.4, outer: null, outerOpacity: 0 },
  thinking: { inner: 'rgba(139,92,246,0.5)', innerOpacity: 0.5, outer: 'rgba(139,92,246,0.3)', outerOpacity: 0.4 },
  speaking: { inner: 'rgba(245,158,11,0.5)', innerOpacity: 0.6, outer: 'rgba(245,158,11,0.3)', outerOpacity: 0.4 },
  listening: { inner: 'rgba(59,130,246,0.5)', innerOpacity: 0.5, outer: 'rgba(59,130,246,0.3)', outerOpacity: 0.4 },
  paused: { inner: 'rgba(107,114,128,0.3)', innerOpacity: 0.3, outer: null, outerOpacity: 0 },
  error: { inner: 'rgba(239,68,68,0.4)', innerOpacity: 0.5, outer: null, outerOpacity: 0 },
};

/** The widget's aura for a phase (muted, ended, denied and unavailable use its `paused` look). */
export function auraFor(phase: OrbPhase): Aura {
  switch (phase) {
    case 'connecting':
    case 'reconnecting':
    case 'rationale':
      return AURA.connecting;
    case 'thinking':
    case 'speaking':
    case 'listening':
      return AURA[phase];
    case 'error':
      return AURA.error;
    default:
      return AURA.paused;
  }
}

/** Dimmed sphere (widget `.vtorb-large-muted`). */
export function sphereDimmed(phase: OrbPhase): boolean {
  return phase === 'muted' || phase === 'ended' || phase === 'denied' || phase === 'unavailable';
}

/** `.vtorb-large` / `.vtorb-fab` background. */
export const SPHERE_GRADIENT = 'radial-gradient(circle at 35% 35%, #7c8db5, #5a6a8a 50%, #3a4a6a 100%)';
/** `.vtorb-overlay` background. */
export const OVERLAY_BACKGROUND = 'rgba(10, 12, 20, 0.92)';
/** `.vtorb-fab` pulse period. */
export const FAB_PULSE_MS = 4000;
export const FAB_SIZE = 56;

/** `recent_routes` for the start payload / context updates: most recent first, no repeats, ≤ max. */
export function pushRecentRoute(recent: readonly string[], route: string, max = 5): string[] {
  if (!route) return [...recent];
  return [route, ...recent.filter((r) => r !== route)].slice(0, max);
}
