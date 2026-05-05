/**
 * E6 — Find a Match diagnostic probe.
 *
 * The Find-a-Match list surfaces a generic "Failed to fetch" when the
 * gateway request can't complete. That string is what the browser
 * throws for *any* network-layer failure (DNS, CORS preflight,
 * offline, dead origin, service worker eating the request) and tells
 * us nothing actionable on a phone where DevTools isn't trivial.
 *
 * This module runs a small, structured set of probes and returns a
 * report we can render inline so the failure mode is identifiable
 * without remote debugging:
 *
 *   - Reachability of the gateway host via `mode: 'no-cors'`
 *     (resolves opaque even when CORS would block a normal request).
 *   - The actual `/api/v1/intents` call with the user's token, so we
 *     capture HTTP status + a response-body excerpt when it does
 *     respond, or the network error name + message when it doesn't.
 *   - Surrounding device state: online flag, service-worker control,
 *     auth-token presence (snippet only, never the full JWT),
 *     origin, user agent.
 *
 * Combined, this disambiguates:
 *   reachability fail + intents fail   → DNS / network / device offline
 *   reachability ok + intents TypeError → CORS rejecting the call
 *   reachability ok + intents 401/403  → auth / role problem
 *   both ok                            → app/data-shape problem
 */

import { supabase } from '@/integrations/supabase/client';
import { COMMUNITY_GATEWAY } from './community-gateway';

export interface ProbeResult {
  label: string;
  ok: boolean;
  detail: string;
  ms: number;
}

export interface DiagnosticReport {
  capturedAt: string;
  origin: string;
  gatewayUrl: string;
  online: boolean;
  serviceWorker: 'none' | 'registered-no-controller' | 'controlled-by-sw';
  swScript: string | null;
  tokenPresent: boolean;
  tokenSnippet: string | null;
  userAgent: string;
  probes: ProbeResult[];
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T | null; ms: number; error?: Error }> {
  const start = performance.now();
  try {
    const value = await fn();
    return { value, ms: Math.round(performance.now() - start) };
  } catch (e) {
    return {
      value: null,
      ms: Math.round(performance.now() - start),
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/** Can we reach the gateway origin at all? Uses no-cors so CORS can't mask DNS/network reachability. */
async function probeReachability(): Promise<ProbeResult> {
  const t = await timed(() => fetch(COMMUNITY_GATEWAY, { mode: 'no-cors', cache: 'no-store' }));
  if (t.error) {
    return {
      label: 'reach gateway host (no-cors)',
      ok: false,
      ms: t.ms,
      detail: `${t.error.name}: ${t.error.message}`,
    };
  }
  return {
    label: 'reach gateway host (no-cors)',
    ok: true,
    ms: t.ms,
    detail: `host responded (opaque, type=${t.value!.type})`,
  };
}

/** The real call the page makes. Captures status + response body excerpt or network error. */
async function probeIntents(token: string | null): Promise<ProbeResult> {
  const headers: Record<string, string> = { 'X-Vitana-Active-Role': 'community' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const t = await timed(() =>
    fetch(`${COMMUNITY_GATEWAY}/api/v1/intents?status=open`, { headers, cache: 'no-store' }),
  );

  if (t.error) {
    return {
      label: 'GET /api/v1/intents?status=open',
      ok: false,
      ms: t.ms,
      detail: `${t.error.name}: ${t.error.message}`,
    };
  }

  const res = t.value!;
  let bodyExcerpt = '';
  try {
    const text = await res.text();
    bodyExcerpt = text.length > 200 ? `${text.slice(0, 200)}…` : text;
  } catch {
    /* body unreadable — keep going */
  }

  return {
    label: 'GET /api/v1/intents?status=open',
    ok: res.ok,
    ms: t.ms,
    detail: `${res.status} ${res.statusText}${bodyExcerpt ? ` — ${bodyExcerpt}` : ''}`,
  };
}

export async function runMatchDiagnostic(): Promise<DiagnosticReport> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? null;

  let sw: DiagnosticReport['serviceWorker'] = 'none';
  let swScript: string | null = null;
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        sw = navigator.serviceWorker.controller ? 'controlled-by-sw' : 'registered-no-controller';
        swScript = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? null;
      }
    } catch {
      /* ignore — no SW info available */
    }
  }

  const probes = await Promise.all([probeReachability(), probeIntents(token)]);

  return {
    capturedAt: new Date().toISOString(),
    origin: typeof window !== 'undefined' ? window.location.origin : 'n/a',
    gatewayUrl: COMMUNITY_GATEWAY,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    serviceWorker: sw,
    swScript,
    tokenPresent: !!token,
    // Snippet only — never the full JWT.
    tokenSnippet: token ? `${token.slice(0, 8)}…${token.slice(-6)}` : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
    probes,
  };
}
