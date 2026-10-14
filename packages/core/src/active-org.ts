/**
 * VTID-05183 — the business-mode active-org store over an injected storage.
 * Same behaviour as the web's getActiveOrgIdSnapshot / setActiveOrgId /
 * subscribeActiveOrgId (src/lib/business-mode.ts), which read
 * window.localStorage: a storage that is missing or throws means "first org".
 * Synchronous on purpose (useSyncExternalStore), so the storage passed here
 * must answer getItem synchronously; an async answer is ignored.
 */
import { ACTIVE_ORG_STORAGE_KEY } from './extracted/business-mode.generated';
import type { KeyValueStorage } from './storage';

export interface ActiveOrgStore {
  getSnapshot(): string | null;
  set(id: string | null): void;
  subscribe(listener: () => void): () => void;
}

export function createActiveOrgStore(storage: KeyValueStorage): ActiveOrgStore {
  const listeners = new Set<() => void>();
  let memory: string | null | undefined;
  const read = (): string | null => {
    try {
      const v = storage.getItem(ACTIVE_ORG_STORAGE_KEY);
      return typeof v === 'string' ? v : null;
    } catch {
      return null;
    }
  };
  const write = (id: string | null) => {
    try {
      const r = id ? storage.setItem(ACTIVE_ORG_STORAGE_KEY, id) : storage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => undefined);
    } catch {
      /* ignore — the in-memory value still carries it for this session */
    }
  };
  return {
    getSnapshot() {
      if (memory === undefined) memory = read();
      return memory;
    },
    set(id) {
      memory = id;
      write(id);
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
