/**
 * VTID-05648 — session and journey ids. Web keeps them in sessionStorage (one per tab lifetime); the native twin keeps
 * them in memory, one per app launch.
 */
import { randomUUID } from 'expo-crypto';

let sessionId: string | null = null;
let journeyId: string | null = null;

function newId(prefix: string): string {
  try {
    const id = randomUUID();
    if (id) return id;
  } catch {
    // fall through to the timestamp id
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateAnalyticsSessionId(): string {
  if (!sessionId) sessionId = newId('session');
  return sessionId;
}

export function getOrCreateJourneyId(): string {
  if (!journeyId) journeyId = newId('journey');
  return journeyId;
}

export function resetJourneyId(): void {
  journeyId = null;
}

export function __resetSessionForTests(): void {
  sessionId = null;
  journeyId = null;
}
