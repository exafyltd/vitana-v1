/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — the one door to the video engine
 * of a live room (web `src/components/liverooms/DailyVideoRoom.tsx`, Daily.co). The viewer
 * renders `Surface` with the private room URL and the meeting token that the gateway's `enter`
 * call returned, and forwards the join and leave events back to the host-presence signals.
 *
 * This build registers no engine. The Daily.co SDK is not a dependency of `apps/mobile` yet, and
 * the device join is a G1 owner step. With no engine the viewer shows the "video unavailable"
 * state and does not call `enter`, so this build never records attendance for a join it cannot
 * complete. Unit tests register a fake surface through `registerLiveRoomVideoEngine`.
 */
import type { ComponentType } from 'react';

export interface LiveRoomVideoProps {
  roomUrl: string;
  /** Daily meeting token from the gateway's `enter` call (owner token for the host). */
  token?: string;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
}

export interface LiveRoomVideoEngine {
  Surface: ComponentType<LiveRoomVideoProps>;
}

let engine: LiveRoomVideoEngine | null = null;

export function getLiveRoomVideoEngine(): LiveRoomVideoEngine | null {
  return engine;
}

/** Replaces the engine. `null` restores the build default (no engine). */
export function registerLiveRoomVideoEngine(next: LiveRoomVideoEngine | null): void {
  engine = next;
}
