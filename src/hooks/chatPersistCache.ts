import type { GlobalMessageThread, GlobalMessage } from "./useGlobalMessages";

const THREADS_KEY = "vitana-chat-threads";
const MSG_PREFIX = "vitana-chat-msgs-";
const MAX_THREADS = 50;
const MAX_MESSAGES_PER_THREAD = 200;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEnvelope<T> {
  data: T;
  ts: number;
}

function isExpired(ts: number): boolean {
  return Date.now() - ts > TTL_MS;
}

// ── Threads ──────────────────────────────────────────────────────────

export function persistThreads(userId: string, threads: GlobalMessageThread[]): void {
  try {
    const envelope: CacheEnvelope<GlobalMessageThread[]> = {
      data: threads.slice(0, MAX_THREADS),
      ts: Date.now(),
    };
    localStorage.setItem(`${THREADS_KEY}:${userId}`, JSON.stringify(envelope));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function getCachedThreads(userId: string): GlobalMessageThread[] | null {
  try {
    const raw = localStorage.getItem(`${THREADS_KEY}:${userId}`);
    if (!raw) return null;
    const envelope: CacheEnvelope<GlobalMessageThread[]> = JSON.parse(raw);
    if (isExpired(envelope.ts)) {
      localStorage.removeItem(`${THREADS_KEY}:${userId}`);
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

// ── Messages ─────────────────────────────────────────────────────────

export function persistMessages(threadId: string, messages: GlobalMessage[]): void {
  try {
    const envelope: CacheEnvelope<GlobalMessage[]> = {
      data: messages.slice(-MAX_MESSAGES_PER_THREAD),
      ts: Date.now(),
    };
    localStorage.setItem(`${MSG_PREFIX}${threadId}`, JSON.stringify(envelope));
  } catch {
    // ignore
  }
}

export function getCachedMessages(threadId: string): GlobalMessage[] | null {
  try {
    const raw = localStorage.getItem(`${MSG_PREFIX}${threadId}`);
    if (!raw) return null;
    const envelope: CacheEnvelope<GlobalMessage[]> = JSON.parse(raw);
    if (isExpired(envelope.ts)) {
      localStorage.removeItem(`${MSG_PREFIX}${threadId}`);
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────

export function clearChatCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(THREADS_KEY) || key.startsWith(MSG_PREFIX))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
