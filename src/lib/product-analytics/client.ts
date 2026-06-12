/**
 * Product analytics client (BOOTSTRAP-PRODUCT-ANALYTICS).
 *
 * Batched, fire-and-forget event pipe to the gateway's
 * POST /api/v1/analytics/events/batch. Backs the /admin/insights/*
 * supervision dashboards.
 *
 * Behavior:
 *  - Buffers events in memory; unsent events persist in localStorage under
 *    `vitana_analytics_outbox` so a reload doesn't lose them.
 *  - Flushes at 10 buffered events, every 10 seconds, and on page hide via
 *    navigator.sendBeacon.
 *  - Holds events until tenant context is known (tenant_id is required by
 *    the schema); setAnalyticsContext() is fed by AnalyticsTracker inside
 *    the React tree.
 *  - Never collects input values or raw Assistant message text — forbidden
 *    property keys are dropped client-side (the gateway strips them again).
 *  - Skips all tracking when consent is denied.
 *
 * Must NEVER throw — this runs on production user paths.
 */

import type {
  AnalyticsConsentState,
  AnalyticsDeviceType,
  AnalyticsEvent,
  TrackOptions,
} from "./types";
import { FORBIDDEN_PROPERTY_KEYS } from "./types";
import { getOrCreateAnalyticsSessionId, getOrCreateJourneyId } from "./session";

// VITE_GATEWAY_URL includes "/api/v1" in this repo's .env — strip it the
// same way admin-api.ts does so we never produce /api/v1/api/v1/... paths.
const RAW_GATEWAY = (import.meta.env?.VITE_GATEWAY_URL as string | undefined) || "";
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
const BATCH_PATH = "/api/v1/analytics/events/batch";

const OUTBOX_KEY = "vitana_analytics_outbox";
const CONSENT_KEY = "vitana-analytics-consent";
const FLUSH_AT = 10;
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH = 100;
const MAX_OUTBOX = 300; // hard cap so the outbox can never grow unbounded

interface AnalyticsContext {
  tenantId: string | null;
  userIdHash: string | null;
  language: string | null;
  consent: AnalyticsConsentState;
}

const context: AnalyticsContext = {
  tenantId: null,
  userIdHash: null,
  language: null,
  consent: "anonymous",
};

let buffer: AnalyticsEvent[] = [];
let pending: AnalyticsEvent[] = []; // events tracked before tenant is known
let flushTimer: ReturnType<typeof setInterval> | null = null;
let installed = false;
let lastRoute: string | null = null;

function newEventId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function deviceType(): AnalyticsDeviceType {
  try {
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  } catch {
    return "unknown";
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

function readStoredConsent(): AnalyticsConsentState | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === "granted" || v === "anonymous" || v === "denied") return v;
  } catch {
    // ignore
  }
  return null;
}

function loadOutbox(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOutbox(): void {
  try {
    if (buffer.length === 0) localStorage.removeItem(OUTBOX_KEY);
    else localStorage.setItem(OUTBOX_KEY, JSON.stringify(buffer.slice(-MAX_OUTBOX)));
  } catch {
    // quota/private mode — in-memory buffer still works
  }
}

async function postBatch(events: AnalyticsEvent[], useBeacon: boolean): Promise<boolean> {
  if (!GATEWAY_BASE || events.length === 0) return false;
  const body = JSON.stringify({ events });
  const url = `${GATEWAY_BASE}${BATCH_PATH}`;
  try {
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      return navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function flush(useBeacon = false): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer.slice(0, MAX_BATCH);
  const ok = await postBatch(batch, useBeacon);
  if (ok) {
    buffer = buffer.slice(batch.length);
    saveOutbox();
  }
  // On failure events stay buffered; the interval retries.
}

function drainPending(): void {
  if (!context.tenantId || pending.length === 0) return;
  for (const ev of pending) {
    buffer.push({ ...ev, tenant_id: context.tenantId });
  }
  pending = [];
  saveOutbox();
}

function install(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const stored = readStoredConsent();
  if (stored) context.consent = stored;

  buffer = loadOutbox();

  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  // Don't keep node-ish environments alive (no-op in browsers).
  (flushTimer as any)?.unref?.();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
  window.addEventListener("pagehide", () => void flush(true));
}

/**
 * Fed by AnalyticsTracker (inside the React tree) whenever tenant, user or
 * locale changes. userIdHash must already be hashed — never pass a raw id.
 */
export function setAnalyticsContext(next: {
  tenantId?: string | null;
  userIdHash?: string | null;
  language?: string | null;
  consent?: AnalyticsConsentState;
}): void {
  if (next.tenantId !== undefined) context.tenantId = next.tenantId;
  if (next.userIdHash !== undefined) context.userIdHash = next.userIdHash;
  if (next.language !== undefined) context.language = next.language;
  if (next.consent !== undefined) {
    context.consent = next.consent;
    try {
      localStorage.setItem(CONSENT_KEY, next.consent);
    } catch {
      // ignore
    }
    if (next.consent === "denied") {
      buffer = [];
      pending = [];
      saveOutbox();
    }
  }
  drainPending();
}

export function setAnalyticsConsent(consent: AnalyticsConsentState): void {
  setAnalyticsContext({ consent });
}

export function getAnalyticsConsent(): AnalyticsConsentState {
  return context.consent;
}

/** Used by the screen tracker so events can carry previous_route. */
export function noteRouteChange(route: string): string | null {
  const previous = lastRoute;
  lastRoute = route;
  return previous;
}

/**
 * Queue one product analytics event. Fire-and-forget; never throws.
 */
export function track(eventName: string, options: TrackOptions = {}): void {
  try {
    install();
    if (context.consent === "denied") return;

    const event: AnalyticsEvent = {
      event_id: newEventId(),
      event_name: eventName,
      event_type: options.event_type ?? "journey",
      tenant_id: context.tenantId ?? "",
      user_id_hash: context.userIdHash,
      session_id: getOrCreateAnalyticsSessionId(),
      journey_id: getOrCreateJourneyId(),
      conversation_id: options.conversation_id ?? null,
      screen_route: typeof location !== "undefined" ? location.pathname || "/" : "/",
      screen_id: options.screen_id ?? null,
      feature_key: options.feature_key ?? null,
      source: "web",
      app_version: (import.meta.env?.VITE_APP_VERSION as string | undefined) ?? null,
      language: context.language,
      device_type: deviceType(),
      consent_state: context.consent,
      properties: sanitizeProperties(options.properties ?? {}),
      occurred_at: new Date().toISOString(),
    };

    if (!context.tenantId) {
      // tenant_id is required by the schema — hold until context arrives.
      pending.push(event);
      if (pending.length > MAX_OUTBOX) pending = pending.slice(-MAX_OUTBOX);
      return;
    }

    buffer.push(event);
    if (buffer.length > MAX_OUTBOX) buffer = buffer.slice(-MAX_OUTBOX);
    saveOutbox();
    if (buffer.length >= FLUSH_AT) void flush();
  } catch {
    // Analytics must never break the app.
  }
}

/** Test hook — exposes internals without shipping them as public API. */
export function __analyticsInternals() {
  return { buffer, pending, context, flush, GATEWAY_BASE, BATCH_PATH };
}
