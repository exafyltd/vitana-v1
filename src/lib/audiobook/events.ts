/**
 * VTID-04761 — Audiobook listening events.
 *
 * Every player milestone is broadcast as a `vitana:audiobook` window event so
 * other parts of the app can react without the player knowing about them.
 *
 * VTID-04763: each one is also sent to product analytics as
 * `audiobook_<name>` (feature_key 'audiobook', snake_case properties). The
 * gateway's GET /admin/tenants/:id/analytics/audiobook turns them into
 * listen-through rate, Season 0 completion, day-7 return and listening →
 * first action. Consent and tenant gating are the analytics client's own.
 */

import { track } from '@/lib/product-analytics/client';

export type AudiobookEventName =
  | 'play_started'
  | 'track_started'
  | 'track_completed'
  | 'episode_completed'
  | 'audiobook_finished'
  | 'ask_vitana'
  | 'try_it_now';

export const AUDIOBOOK_EVENT = 'vitana:audiobook';

export interface AudiobookEventDetail {
  name: AudiobookEventName;
  props: Record<string, unknown>;
  at: number;
}

const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function emitAudiobookEvent(name: AudiobookEventName, props: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const properties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) properties[snake(k)] = v;
    const eventName = name.startsWith('audiobook_') ? name : `audiobook_${name}`;
    track(eventName, { event_type: 'feature', feature_key: 'audiobook', properties });
  } catch {
    /* analytics is best effort */
  }
  try {
    window.dispatchEvent(
      new CustomEvent<AudiobookEventDetail>(AUDIOBOOK_EVENT, { detail: { name, props, at: Date.now() } }),
    );
  } catch {
    /* never let telemetry break playback */
  }
}
