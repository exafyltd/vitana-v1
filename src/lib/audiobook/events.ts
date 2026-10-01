/**
 * VTID-04761 — Audiobook listening events.
 *
 * Every player milestone is broadcast as a `vitana:audiobook` window event so
 * other parts of the app (and the Phase 4 measurement, VTID-04763) can react
 * without the player knowing about them.
 */

export type AudiobookEventName =
  | 'play_started'
  | 'track_started'
  | 'track_completed'
  | 'episode_completed'
  | 'audiobook_finished'
  | 'ask_vitana';

export const AUDIOBOOK_EVENT = 'vitana:audiobook';

export interface AudiobookEventDetail {
  name: AudiobookEventName;
  props: Record<string, unknown>;
  at: number;
}

export function emitAudiobookEvent(name: AudiobookEventName, props: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<AudiobookEventDetail>(AUDIOBOOK_EVENT, { detail: { name, props, at: Date.now() } }),
    );
  } catch {
    /* never let telemetry break playback */
  }
}
