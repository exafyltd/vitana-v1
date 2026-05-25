import { useSyncExternalStore } from "react";

// Tracks whether the external VitanaOrb widget (loaded from the gateway as
// orb-widget.js) currently has an active voice session. The widget plays
// Vitana's TTS through its own AudioContext, which never fires the
// <audio>/<video> events the Soundscape manager listens for — so without this
// signal the background music keeps playing while Vitana speaks.
let sessionActive = false;
const subscribers = new Set<() => void>();

export function setOrbWidgetSessionActive(value: boolean): void {
  if (sessionActive === value) return;
  sessionActive = value;
  subscribers.forEach((notify) => notify());
}

function getSnapshot(): boolean {
  return sessionActive;
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function useOrbWidgetSessionActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
