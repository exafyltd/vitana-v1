/**
 * VTID-05186 (N3, plan change 18) — the top bar's soundscape mute through a
 * port. Audio is not in N3: until the audio lane registers its controller,
 * the stand-in only keeps the muted flag (TopAppBar toggles and reflects it).
 */
import { useSyncExternalStore } from 'react';

export type Soundscape = { isMuted: boolean; toggleMute: () => void };

let muted = false;
const listeners = new Set<() => void>();
let registered: (() => Soundscape) | null = null;

export function registerSoundscape(useImpl: () => Soundscape): void {
  registered = useImpl;
}

function useFlagOnly(): Soundscape {
  const isMuted = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
  );
  return {
    isMuted,
    toggleMute: () => {
      muted = !muted;
      listeners.forEach((l) => l());
    },
  };
}

export function useSoundscape(): Soundscape {
  return (registered ?? useFlagOnly)();
}
