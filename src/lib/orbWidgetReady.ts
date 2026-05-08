import { useSyncExternalStore } from "react";

let authenticated = false;
const subscribers = new Set<() => void>();

export function setOrbWidgetAuthenticated(value: boolean): void {
  if (authenticated === value) return;
  authenticated = value;
  subscribers.forEach((notify) => notify());
}

function getSnapshot(): boolean {
  return authenticated;
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

export function useOrbWidgetAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
