/**
 * RUM beacon — Phase 1 W1 (VTID-03177 PROFILE) + W2 INP (VTID-03201).
 *
 * Captures Core Web Vitals (LCP, TTFB, FCP, CLS, INP) per screen and POSTs
 * them to the gateway's `/api/v1/rum/beacon` endpoint. The gateway
 * translates each beacon into a `screen.latency.measured` OASIS event.
 *
 * LCP / TTFB / FCP / CLS use native PerformanceObservers (no deps).
 * INP uses `web-vitals` (W2 add) — rolling INP by hand requires non-trivial
 * event-buffering because INP measures the slowest input→paint across a
 * page's lifetime, with overlap handling that the `web-vitals` library
 * already gets right.
 *
 * Always-on import: this module installs observers idempotently and is
 * safe to import multiple times. The gateway endpoint returns 204 when
 * `FEATURE_LATENCY_TELEMETRY_ENV` is off, so payloads cost ~nothing
 * end-to-end when the feature is dark.
 *
 * Usage (called from main.tsx after React mounts):
 *   import { initRum } from './lib/rum';
 *   initRum();
 */

import { onINP, type Metric as WebVitalsMetric } from 'web-vitals';

// VITE_GATEWAY_URL includes "/api/v1" in this repo's .env. Strip it (the
// same normalization admin-api.ts does) so the beacon posts to
// /api/v1/rum/beacon and not the doubled /api/v1/api/v1/rum/beacon that
// shipped in earlier builds.
const RAW_GATEWAY = import.meta.env.VITE_GATEWAY_URL || 'https://gateway.vitanaland.com';
const GATEWAY_URL = RAW_GATEWAY.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
const BEACON_PATH = '/api/v1/rum/beacon';
const SESSION_KEY = 'vitana-rum-session';

type Metric = 'LCP' | 'TTFB' | 'CLS' | 'FCP' | 'INP';
type Rating = 'good' | 'needs-improvement' | 'poor';

interface RumBeacon {
  screen: string;
  metric: Metric;
  value: number;
  rating?: Rating;
  session: string;
  captured_at: string;
  user_agent?: string;
  ts_origin_ms?: number;
}

const THRESHOLDS: Record<Metric, [number, number] | null> = {
  LCP: [2500, 4000],
  TTFB: [800, 1800],
  FCP: [1800, 3000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
};

function rate(metric: Metric, value: number): Rating | undefined {
  const thresh = THRESHOLDS[metric];
  if (!thresh) return undefined;
  if (value <= thresh[0]) return 'good';
  if (value <= thresh[1]) return 'needs-improvement';
  return 'poor';
}

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = (crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return `anon-${Date.now()}`;
  }
}

function send(beacon: RumBeacon): void {
  const body = JSON.stringify(beacon);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(`${GATEWAY_URL}${BEACON_PATH}`, blob);
      return;
    }
    fetch(`${GATEWAY_URL}${BEACON_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      // Beacons are anonymous — omitting credentials sidesteps the
      // credentialed-CORS requirements (Access-Control-Allow-Credentials).
      credentials: 'omit',
    }).catch(() => undefined);
  } catch {
    // Beacons must NEVER throw — they run in production user paths.
  }
}

function emit(metric: Metric, value: number): void {
  send({
    screen: location.pathname || '/',
    metric,
    value,
    rating: rate(metric, value),
    session: getSessionId(),
    captured_at: new Date().toISOString(),
    user_agent: navigator.userAgent.slice(0, 512),
    ts_origin_ms: performance.timeOrigin,
  });
}

let installed = false;

export function initRum(): void {
  if (installed) return;
  installed = true;

  if (typeof PerformanceObserver === 'undefined') return;

  // TTFB from PerformanceNavigationTiming.
  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const nav = navEntries[0];
    if (nav && nav.responseStart > 0) {
      emit('TTFB', nav.responseStart);
    }
  } catch {
    // ignore
  }

  // LCP — keep updating until the page becomes hidden, then emit the
  // largest value seen.
  try {
    let lcpValue = 0;
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const v = (entry as PerformanceEntry & { startTime: number }).startTime;
        if (v > lcpValue) lcpValue = v;
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    const onHide = () => {
      if (lcpValue > 0) emit('LCP', lcpValue);
      lcpObserver.disconnect();
      document.removeEventListener('visibilitychange', onHide);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });
  } catch {
    // ignore
  }

  // FCP — first paint of any content.
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          emit('FCP', entry.startTime);
          fcpObserver.disconnect();
          return;
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // ignore
  }

  // CLS — accumulate layout-shift score; emit once on hide.
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // LayoutShift entry: hadRecentInput + value; only score if no input.
        const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!e.hadRecentInput && typeof e.value === 'number') {
          clsValue += e.value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        emit('CLS', clsValue);
      }
    });
  } catch {
    // ignore
  }

  // INP — slowest input→paint over the page's lifetime. web-vitals handles
  // the buffering + overlap logic that's painful to roll by hand. The
  // library fires the callback once per page (or on each significant
  // change if reportAllChanges is true; we leave that off — one beacon per
  // page is what the eval harness expects).
  try {
    onINP((metric: WebVitalsMetric) => {
      if (typeof metric.value === 'number' && Number.isFinite(metric.value)) {
        emit('INP', metric.value);
      }
    });
  } catch {
    // ignore — web-vitals is defensive but never let it break a render
  }
}
