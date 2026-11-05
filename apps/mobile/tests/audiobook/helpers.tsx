/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — test
 * harness. The gateway is N1's real `createGatewayFetch` (Bearer token and
 * `/api/v1` prefix are the production path) over a fake `fetchImpl` that
 * answers by `METHOD /path` and records every request; a route may answer
 * with any HTTP status (`withStatus`). The Supabase double comes from the
 * shared helpers (session only). No network.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { __setAudiobookOriginForTests } from '../../src/ports/audiobook';
import { AudiobookPlayerProvider } from '../../src/screens/audiobook/AudiobookPlayerProvider';
import { fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';

export const ORIGIN = 'https://g1-test.example.org';
export const TOKEN = 'token-audiobook-test';

export type Req = { method: string; path: string; query: URLSearchParams; headers: Record<string, string>; body: any };
const STATUS = Symbol('status');
type Answer = { [STATUS]: number; body: unknown };
export const withStatus = (status: number, body: unknown = { ok: false }): Answer => ({ [STATUS]: status, body });
export type Route = unknown | ((req: Req) => unknown);

export function audiobookGateway(routes: Record<string, Route>) {
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
    const answer = typeof route === 'function' ? (route as (r: Req) => unknown)(req) : route;
    let status = 200;
    let body: unknown = answer;
    if (answer && typeof answer === 'object' && STATUS in (answer as object)) {
      status = (answer as Answer)[STATUS];
      body = (answer as Answer).body;
    } else if (answer === undefined) {
      status = 404;
      body = { ok: false, error: 'not_found' };
    }
    const text = JSON.stringify(body);
    return { ok: status >= 200 && status < 300, status, text: async () => text } as unknown as Response;
  };
  return { gateway: createGatewayFetch({ origin: ORIGIN, getAccessToken: () => TOKEN, fetchImpl }), requests };
}

function sessionClient(userId: string | null) {
  const session = userId ? { ...fakeSession(userId), access_token: TOKEN } : null;
  return {
    auth: {
      getSession: jest.fn(async () => ({ data: { session }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
      signOut: jest.fn(async () => ({ error: null })),
    },
    from: jest.fn(() => {
      const b: any = { then: (res: (r: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res) };
      for (const op of ['select', 'eq', 'gt', 'gte', 'lt', 'lte', 'is', 'in', 'order', 'limit', 'single', 'maybeSingle', 'update', 'insert', 'ilike']) b[op] = () => b;
      return b;
    }),
    rpc: jest.fn(async () => ({ data: null, error: null })),
    functions: { invoke: jest.fn(async () => ({ data: null, error: null })) },
  };
}

/** Providers + the Audiobook player, a signed-in member (u-1) and the fake gateway. */
export function audiobookWrapper(routes: Record<string, Route>, opts: { language?: string; signedIn?: boolean; client?: unknown; withPlayer?: boolean } = {}) {
  const client = opts.client ?? sessionClient(opts.signedIn === false ? null : 'u-1');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  const Base = makeWrapper({ client, language: opts.language ?? 'en-US', queryClient });
  const gw = audiobookGateway(routes);
  __setGatewayForTests(gw.gateway);
  __setAudiobookOriginForTests(ORIGIN);
  const wrapper = ({ children }: { children: ReactNode }) => <Base>{opts.withPlayer === false ? children : <AudiobookPlayerProvider>{children}</AudiobookPlayerProvider>}</Base>;
  return { wrapper, requests: gw.requests, queryClient };
}

// ── fixtures ─────────────────────────────────────────────────────────────
export const topics = [
  { topicId: 'T001', session: 1, position: 1, chapterId: 'prolog', displayLabel: 'Meet Vitana', shortDescription: null, explanation: { whatItIs: null, userBenefit: null, whenToUse: null, tryThis: null }, guidedPracticeTarget: 'orb_overview', businessGate: null },
  { topicId: 'T002', session: 1, position: 2, chapterId: 'prolog', displayLabel: 'Your journey', shortDescription: null, explanation: { whatItIs: null, userBenefit: null, whenToUse: null, tryThis: null }, guidedPracticeTarget: 'memory', businessGate: null },
  { topicId: 'T003', session: 2, position: 1, chapterId: 'basics', displayLabel: 'The Vitana Index', shortDescription: null, explanation: { whatItIs: null, userBenefit: null, whenToUse: null, tryThis: null }, guidedPracticeTarget: 'vitana_index', businessGate: null },
];

export const state = (extra: Record<string, unknown> = {}) => ({
  ok: true,
  state: { mode: 'guided', onboardingStatus: 'in_progress', enteredFullModeAt: null, returnedToGuidedAt: null, qualifiedAt: null, completedTopicIds: [], completedSessionNumbers: [], ...extra },
});

export const baseRoutes = (extra: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /journey-checklist': { ok: true, topics },
  'GET /journey/state': state(),
  'POST /journey/session-listened': { ok: true, awarded: true },
  ...extra,
});

/** Lets pending promises and React Query settle. */
export const flush = () => new Promise((res) => setTimeout(res, 0));
