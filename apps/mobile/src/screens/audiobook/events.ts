/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — twin
 * of `src/lib/audiobook/events.ts`: every player milestone is broadcast as
 * `vitana:audiobook` `{ name, props, at }` so other parts of the app react
 * without the player knowing them. The web window event becomes the native
 * overlay bus (same event name, same detail).
 *
 * The web also forwards each event to product analytics as `audiobook_<name>`
 * (snake_case properties). The native app has no product-analytics client
 * yet (no native twin of `src/lib/product-analytics/client.ts`); the bus
 * event carries the same name and properties for it (follow-up in
 * docs/validation/VTID-05460/verification.md).
 */
import { overlayBus } from '../../navigation/overlay-bus';

export type AudiobookEventName = 'play_started' | 'track_started' | 'track_completed' | 'episode_completed' | 'audiobook_finished' | 'ask_vitana' | 'try_it_now';

export const AUDIOBOOK_EVENT = 'vitana:audiobook';

export interface AudiobookEventDetail {
  name: AudiobookEventName;
  props: Record<string, unknown>;
  at: number;
}

export function emitAudiobookEvent(name: AudiobookEventName, props: Record<string, unknown>): void {
  try {
    overlayBus.emit(AUDIOBOOK_EVENT, { name, props, at: Date.now() } satisfies AudiobookEventDetail);
  } catch {
    /* never let telemetry break playback */
  }
}
