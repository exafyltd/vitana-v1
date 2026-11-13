/**
 * VTID-05648 (native-wave2-fix-forward-r2/analytics) — native twin of the web product analytics client
 * (`src/lib/product-analytics/client.ts`): a batched, fire-and-forget pipe to the gateway's
 * `POST /api/v1/analytics/events/batch`.
 *
 *  - Events buffer in memory and persist in AsyncStorage (`vitana_analytics_outbox`, 300 cap), so a restart keeps them.
 *  - Flush at 10 events, every 10 s (timer started on the first `track`), and when the app goes to the background.
 *    One POST carries at most 100 events; a failed POST keeps the batch for the next flush.
 *  - Events wait for a tenant id (the schema requires it); `setAnalyticsContext` releases them.
 *  - Consent `denied` drops everything and tracks nothing; forbidden property keys are never sent.
 *  - No Authorization header and `credentials: 'omit'`, as on web. Without a gateway origin nothing is posted.
 *
 * Must NEVER throw — it runs on every screen.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import { AppState, Dimensions, Platform, type NativeEventSubscription } from 'react-native';
import { config, endpoints } from '../ports/env';
import { getOrCreateAnalyticsSessionId, getOrCreateJourneyId, __resetSessionForTests } from './session';
import { FORBIDDEN_PROPERTY_KEYS } from './types';
import type { AnalyticsConsentState, AnalyticsDeviceType, AnalyticsEvent, AnalyticsSource, TrackOptions } from './types';

const BATCH_PATH = '/api/v1/analytics/events/batch';
const OUTBOX_KEY = 'vitana_analytics_outbox';
const CONSENT_KEY = 'vitana-analytics-consent';
const FLUSH_AT = 10;
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH = 100;
const MAX_OUTBOX = 300;

interface AnalyticsContext {
  tenantId: string | null;
  userIdHash: string | null;
  language: string | null;
  consent: AnalyticsConsentState;
}

const context: AnalyticsContext = { tenantId: null, userIdHash: null, language: null, consent: 'anonymous' };

let buffer: AnalyticsEvent[] = [];
let pending: AnalyticsEvent[] = []; // tracked before the tenant is known
let flushTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: NativeEventSubscription | null = null;
let installed = false;
let hydrating: Promise<void> | null = null;
let flushing: Promise<void> | null = null;
let consentSetByCaller = false;
let lastRoute: string | null = null;
let epoch = 0; // bumped by `denied` so a late hydrate or flush cannot resurrect cleared events

function gatewayBase(): string {
  try {
    return endpoints(config).gatewayOrigin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function newEventId(): string {
  try {
    const id = randomUUID();
    if (id) return id;
  } catch {
    // fall through
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function platformSource(): AnalyticsSource {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

function deviceType(): AnalyticsDeviceType {
  try {
    const w = Dimensions.get('window').width;
    if (!w) return 'unknown';
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  } catch {
    return 'unknown';
  }
}

function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if ((FORBIDDEN_PROPERTY_KEYS as readonly string[]).includes(key)) continue;
    clean[key] = value;
  }
  return clean;
}

function saveOutbox(): void {
  const snapshot = buffer.slice(-MAX_OUTBOX);
  const write = snapshot.length === 0 ? AsyncStorage.removeItem(OUTBOX_KEY) : AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(snapshot));
  void Promise.resolve(write).catch(() => undefined);
}

async function hydrate(): Promise<void> {
  const mine = epoch;
  try {
    if (!consentSetByCaller) {
      const stored = await AsyncStorage.getItem(CONSENT_KEY);
      if (!consentSetByCaller && (stored === 'granted' || stored === 'anonymous' || stored === 'denied')) context.consent = stored;
    }
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!raw || mine !== epoch || context.consent === 'denied') return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const ids = new Set(buffer.map((e) => e.event_id));
    buffer = [...(parsed as AnalyticsEvent[]).filter((e) => e && !ids.has(e.event_id)), ...buffer].slice(-MAX_OUTBOX);
  } catch {
    // unreadable storage — the in-memory buffer still works
  }
}

async function postBatch(events: AnalyticsEvent[]): Promise<boolean> {
  const base = gatewayBase();
  if (!base || events.length === 0) return false;
  try {
    const res = await fetch(`${base}${BATCH_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      credentials: 'omit',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function runFlush(): Promise<void> {
  if (hydrating) await hydrating;
  const mine = epoch;
  let first = true;
  // One batch per flush; a backlog of at least FLUSH_AT events keeps going, a few stragglers wait for the next flush.
  while (buffer.length >= (first ? 1 : FLUSH_AT) && mine === epoch) {
    first = false;
    const batch = buffer.slice(0, MAX_BATCH);
    const ok = await postBatch(batch);
    if (!ok) return; // events stay buffered; the interval retries
    if (mine !== epoch) return;
    buffer = buffer.slice(batch.length); // only ever appended to while a POST is in flight
    saveOutbox();
  }
}

/** Send what is buffered (one request per 100 events). Concurrent calls share one run. */
export function flushAnalytics(): Promise<void> {
  if (flushing) return flushing;
  flushing = runFlush()
    .catch(() => undefined)
    .finally(() => {
      flushing = null;
    });
  return flushing;
}

function drainPending(): void {
  if (!context.tenantId || pending.length === 0) return;
  for (const ev of pending) buffer.push({ ...ev, tenant_id: context.tenantId });
  pending = [];
  if (buffer.length > MAX_OUTBOX) buffer = buffer.slice(-MAX_OUTBOX);
  saveOutbox();
}

function install(): void {
  if (installed) return;
  installed = true;
  hydrating = hydrate().finally(() => {
    hydrating = null;
  });
  flushTimer = setInterval(() => void flushAnalytics(), FLUSH_INTERVAL_MS);
  (flushTimer as unknown as { unref?: () => void }).unref?.();
  try {
    appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'background') void flushAnalytics();
    });
  } catch {
    // no AppState — the interval still flushes
  }
}

/** Fed by AnalyticsTracker whenever tenant, user or language changes. `userIdHash` must already be hashed. */
export function setAnalyticsContext(next: {
  tenantId?: string | null;
  userIdHash?: string | null;
  language?: string | null;
  consent?: AnalyticsConsentState;
}): void {
  try {
    if (next.tenantId !== undefined) context.tenantId = next.tenantId;
    if (next.userIdHash !== undefined) context.userIdHash = next.userIdHash;
    if (next.language !== undefined) context.language = next.language;
    if (next.consent !== undefined) {
      context.consent = next.consent;
      consentSetByCaller = true;
      void Promise.resolve(AsyncStorage.setItem(CONSENT_KEY, next.consent)).catch(() => undefined);
      if (next.consent === 'denied') {
        epoch += 1;
        buffer = [];
        pending = [];
        saveOutbox();
      }
    }
    drainPending();
  } catch {
    // analytics must never break the app
  }
}

export function setAnalyticsConsent(consent: AnalyticsConsentState): void {
  setAnalyticsContext({ consent });
}

export function getAnalyticsConsent(): AnalyticsConsentState {
  return context.consent;
}

/** Remember the current route (for `screen_route`) and return the previous one, for `previous_route`. */
export function noteRouteChange(route: string): string | null {
  const previous = lastRoute;
  lastRoute = route;
  return previous;
}

/** Queue one product analytics event. Fire-and-forget; never throws. */
export function track(eventName: string, options: TrackOptions = {}): void {
  try {
    install();
    if (context.consent === 'denied') return;

    const event: AnalyticsEvent = {
      event_id: newEventId(),
      event_name: eventName,
      event_type: options.event_type ?? 'journey',
      tenant_id: context.tenantId ?? '',
      user_id_hash: context.userIdHash,
      session_id: getOrCreateAnalyticsSessionId(),
      journey_id: getOrCreateJourneyId(),
      conversation_id: options.conversation_id ?? null,
      screen_route: lastRoute || '/',
      screen_id: options.screen_id ?? null,
      feature_key: options.feature_key ?? null,
      source: platformSource(),
      app_version: (Constants.expoConfig?.version as string | undefined) ?? null,
      language: context.language,
      device_type: deviceType(),
      consent_state: context.consent,
      properties: sanitizeProperties(options.properties ?? {}),
      occurred_at: new Date().toISOString(),
    };

    if (!context.tenantId) {
      pending.push(event);
      if (pending.length > MAX_OUTBOX) pending = pending.slice(-MAX_OUTBOX);
      return;
    }

    buffer.push(event);
    if (buffer.length > MAX_OUTBOX) buffer = buffer.slice(-MAX_OUTBOX);
    saveOutbox();
    if (buffer.length >= FLUSH_AT) void flushAnalytics();
  } catch {
    // analytics must never break the app
  }
}

/** Test hooks — not public API. */
export function __analyticsState() {
  return { buffer, pending, context };
}

export async function __resetAnalyticsForTests(): Promise<void> {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  appStateSub?.remove();
  appStateSub = null;
  epoch += 1;
  try {
    if (flushing) await flushing;
  } catch {
    // ignore
  }
  buffer = [];
  pending = [];
  installed = false;
  hydrating = null;
  flushing = null;
  consentSetByCaller = false;
  lastRoute = null;
  context.tenantId = null;
  context.userIdHash = null;
  context.language = null;
  context.consent = 'anonymous';
  __resetSessionForTests();
}
