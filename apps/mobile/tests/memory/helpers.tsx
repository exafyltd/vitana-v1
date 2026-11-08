/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — test harness for the
 * memory screens. The gateway is N1's real `createGatewayFetch` (so the
 * Bearer token and `/api/v1` prefix are the production code path) over a
 * fake `fetchImpl` that answers by `METHOD /path` (query string ignored) and
 * records every request with its headers and body. No network: the test
 * files import `../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { configure } from '@testing-library/react-native';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';

// Give findBy and waitFor 5 s instead of RNTL's 1 s default under default-worker load (as tests/settings/helpers.tsx).
configure({ asyncUtilTimeout: 5000 });
// Chained 5 s waits must fit inside the test's own budget (Jest default 5 s).
jest.setTimeout(30000);

export const ORIGIN = 'https://g1-test.example.org';
export const TOKEN = 'token-memory-test';

export type Route = unknown | ((req: Req) => unknown);
export type Req = { method: string; path: string; query: URLSearchParams; headers: Record<string, string>; body: any };

/** A route answers 200 with its JSON; `FAIL` answers 500; a missing route answers 404. */
export const FAIL = Symbol('fail');

export function memoryGateway(routes: Record<string, Route>) {
  const requests: Req[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = (init.headers ?? {}) as Record<string, string>;
    const req: Req = { method, path, query: u.searchParams, headers, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined };
    requests.push(req);
    const key = `${method} ${path}`;
    const route = Object.prototype.hasOwnProperty.call(routes, key) ? routes[key] : undefined;
    const body = typeof route === 'function' ? (route as (r: Req) => unknown)(req) : route;
    const status = body === undefined ? 404 : body === FAIL ? 500 : 200;
    const text = body === undefined || body === FAIL ? '{"ok":false,"error":"x"}' : JSON.stringify(body);
    return { ok: status === 200, status, text: async () => text } as unknown as Response;
  };
  const gateway = createGatewayFetch({ origin: ORIGIN, getAccessToken: () => TOKEN, fetchImpl });
  return { gateway, requests };
}

/** Provider wrapper (signed-in member) with the memory gateway installed. */
export function memoryWrapper(routes: Record<string, Route>, language = 'en-US') {
  const { client } = createSupabaseDouble({ session: fakeSession('u-1') });
  const wrapper = makeWrapper({ client, language });
  const gw = memoryGateway(routes);
  __setGatewayForTests(gw.gateway);
  return { wrapper, requests: gw.requests };
}

// ── fixtures ─────────────────────────────────────────────────────────────
export const spotlight = {
  score_total: 412,
  tier: 'building',
  change_today: 3,
  change_7d: 12,
  pillars: {
    nutrition: { score: 90, change_today: 2, momentum: 'rising' },
    hydration: { score: 70, change_today: 0, momentum: 'steady' },
    exercise: { score: 60, change_today: 1, momentum: 'rising' },
    sleep: { score: 40, change_today: 0, momentum: 'slipping' },
    mental: { score: 80, change_today: 0, momentum: 'steady' },
  },
  balance: { factor: 0.9, penalty_pct: 8, reason_key: 'x', weakest_pillar: 'sleep' },
  weakest_pillar: 'sleep',
  strongest_pillar: 'nutrition',
};

const now = new Date();
export const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30).toISOString();

export const moment = {
  kind: 'moment',
  id: 'm-1',
  at: todayIso,
  tier: 'moment',
  activity_type: 'water',
  pillar: 'hydration',
  secondary_pillar: null,
  category: 'hydration',
  topic: 'water_logged',
  icon: 'Droplets',
  sensitivity: 'special_category',
  summary: { key: 'x', params: { amount_ml: 500, via: 'voice' } },
  influence: { kind: 'measured', delta_pillars: { hydration: 4 } },
  hidden_from_ai: false,
};

export const gardenRoutes = {
  'GET /memory/garden/categories': { total: 3, categories: [{ category: 'health_wellness', count: 3, last_updated_at: null }] },
  'GET /memory/garden/entries': {
    entries: [
      { kind: 'fact', id: 'f1', category: 'health_wellness', content: 'Drinks green tea every morning', source: 'ai', confidence: 0.8, user_confirmed: false, occurred_at: todayIso },
      { kind: 'episode', id: 'e1', category: 'uncategorized', content: 'Walked by the river', episode_kind: 'diary', source: 'diary', confidence: null, user_confirmed: true, occurred_at: todayIso },
    ],
  },
};

export const overviewRoutes: Record<string, Route> = {
  'GET /timeline/spotlight': { spotlight },
  'GET /timeline/routines': { routines: [{ id: 'r1', routine_kind: 'active_hours', routine_key: 'k', metadata: { bucket: 'morning' }, confidence: 0.7 }] },
  'GET /presence/self-awareness-summary': {
    ok: true,
    items: [{ kind: 'pref', label: 'Prefers', value: 'Morning walks', source: 'memory' }],
    last_refreshed_at: todayIso,
    user_controls: { edit_memory_url: '/memory', pause_proactivity_url: '/settings' },
  },
  ...gardenRoutes,
};
