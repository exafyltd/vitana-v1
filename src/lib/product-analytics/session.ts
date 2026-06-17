/**
 * Product analytics session/journey identity (BOOTSTRAP-PRODUCT-ANALYTICS).
 *
 * Session id lives in sessionStorage (one per browser tab lifetime, same
 * model as the RUM session in src/lib/rum.ts). Journey id is sessionStorage
 * too — it groups a contiguous run of screens within the session and can be
 * rotated explicitly (e.g. on logout) via resetJourneyId().
 */

const SESSION_KEY = "vitana-analytics-session-id";
const JOURNEY_KEY = "vitana-analytics-journey-id";

function newId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // fall through to the timestamp id
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getOrCreate(key: string, prefix: string): string {
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = newId(prefix);
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    // sessionStorage unavailable (private mode/quota) — stable per-load id
    return newId(prefix);
  }
}

export function getOrCreateAnalyticsSessionId(): string {
  return getOrCreate(SESSION_KEY, "session");
}

export function getOrCreateJourneyId(): string {
  return getOrCreate(JOURNEY_KEY, "journey");
}

export function resetJourneyId(): void {
  try {
    sessionStorage.removeItem(JOURNEY_KEY);
  } catch {
    // ignore
  }
}
