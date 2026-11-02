/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — test harness for
 * My Journey. The gateway is N1's real `createGatewayFetch` (Bearer token and
 * `/api/v1` prefix are the production code path) over a fake `fetchImpl` that
 * answers by `METHOD /path` and records every request (path, query, headers,
 * body). Supabase is an in-memory double that records every chained call
 * (table, filters, writes, RPCs, edge functions) and answers from fixtures.
 * No network: the test files import `../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';

export const ORIGIN = 'https://g1-test.example.org';
export const TOKEN = 'token-journey-test';
export const FAIL = Symbol('fail');

export type Req = { method: string; path: string; query: URLSearchParams; headers: Record<string, string>; body: any };
export type Route = unknown | ((req: Req) => unknown);

export function journeyGateway(routes: Record<string, Route>) {
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
  return { gateway: createGatewayFetch({ origin: ORIGIN, getAccessToken: () => TOKEN, fetchImpl }), requests };
}

export type DbCall = { table: string; op: 'select' | 'update' | 'insert'; values?: any; filters: Array<[string, string, any]> };

/** A chainable supabase-js double: every builder method records, `await` answers from `tables[table]`. */
export function journeySupabase(
  opts: { tables?: Record<string, any[] | ((call: DbCall) => any[] | null)>; rpc?: Record<string, (args: any) => any>; functions?: Record<string, (body: any) => { data?: any; error?: any }>; userId?: string } = {},
) {
  const session = fakeSession(opts.userId ?? 'u-1');
  const calls: DbCall[] = [];
  const rpcCalls: Array<{ name: string; args: any }> = [];
  const functions: string[] = [];
  const functionCalls: Array<{ name: string; body: any }> = [];
  const answer = (call: DbCall): any => {
    const t = opts.tables?.[call.table];
    if (typeof t === 'function') return t(call);
    return t ?? [];
  };
  function from(table: string) {
    const call: DbCall = { table, op: 'select', filters: [] };
    let single = false;
    let maybe = false;
    const run = () => {
      calls.push(call);
      const rows = call.op === 'update' ? null : answer(call);
      if (call.op === 'insert') return { data: single ? { id: 'new-1', ...call.values } : [call.values], error: null };
      if (single || maybe) return { data: Array.isArray(rows) ? (rows[0] ?? null) : rows, error: null };
      return { data: rows, error: null };
    };
    const b: any = {
      select: () => b,
      insert: (v: any) => ((call.op = 'insert'), (call.values = v), b),
      update: (v: any) => ((call.op = 'update'), (call.values = v), b),
      single: () => ((single = true), b),
      maybeSingle: () => ((maybe = true), b),
      then: (res: (r: any) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    for (const op of ['eq', 'gt', 'gte', 'lt', 'lte', 'is', 'in', 'order', 'limit', 'ilike']) b[op] = (c: any, v?: any) => (call.filters.push([op, c, v]), b);
    return b;
  }
  const client = {
    auth: {
      getSession: jest.fn(async () => ({ data: { session }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
      signOut: jest.fn(async () => ({ error: null })),
    },
    from: jest.fn(from),
    rpc: jest.fn(async (name: string, args: any) => {
      rpcCalls.push({ name, args });
      const h = opts.rpc?.[name];
      return h ? { data: h(args), error: null } : { data: null, error: null };
    }),
    functions: {
      invoke: jest.fn(async (name: string, init?: { body?: any }) => {
        functions.push(name);
        functionCalls.push({ name, body: init?.body });
        const h = opts.functions?.[name];
        const r = h ? h(init?.body) : {};
        return { data: r.data ?? null, error: r.error ?? null };
      }),
    },
  };
  return { client, calls, rpcCalls, functions, functionCalls };
}

export function journeyWrapper(
  routes: Record<string, Route>,
  opts: {
    language?: string;
    tables?: Record<string, any[] | ((call: DbCall) => any[] | null)>;
    rpc?: Record<string, (args: any) => any>;
    functions?: Record<string, (body: any) => { data?: any; error?: any }>;
  } = {},
) {
  const db = journeySupabase({ tables: opts.tables, rpc: opts.rpc, functions: opts.functions });
  const wrapper = makeWrapper({ client: db.client, language: opts.language ?? 'en-US' });
  const gw = journeyGateway(routes);
  __setGatewayForTests(gw.gateway);
  return { wrapper, requests: gw.requests, db };
}

// ── fixtures ─────────────────────────────────────────────────────────────
const now = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d;
};

export const journeyFull = {
  ok: true,
  vtid: 'x',
  journey: { day_in_journey: 11, total_days: 90, days_left: 79, plan_type: 'default', plan_summary: null, status: 'active', is_first_session: false, last_session_date: null, is_past_total_days: false, current_phase: null, fallback_used: false },
  life_compass: {
    active_goal_text: 'Transform Health',
    pillar_focus: 'sleep',
    confidence_score: null,
    target_date: iso(plusDays(120)),
    target_value: null,
    target_unit: null,
    set_at: null,
    has_deadline: true,
    days_to_deadline: 120,
    goal_total_days: 150,
    goal_day: 30,
    goal_progress_pct: 20,
  },
  vitana_index: null,
};

export const journeyNoGoal = { ...journeyFull, life_compass: null };

export const onboarding = {
  recommendations: [
    { id: 'o1', title: 'Drink a glass of water', summary: 'Hydration first', status: 'completed', source_ref: 'x', impact_score: 1, wave_id: 'wave-0' },
    { id: 'o2', title: 'Walk ten minutes', summary: 'Gentle movement', status: 'new', source_ref: 'x', impact_score: 1, horizon: 'today' },
    { id: 'o3', title: 'Plan your week', summary: 'Calendar time', status: 'new', source_ref: 'x', impact_score: 1, wave_id: 'wave-2' },
  ],
};

export const autopilotRecs = [
  { id: 'a1', title: 'Join the morning walk', summary: 'Meet two members', domain: 'community', risk_level: 'high', impact_score: 1, effort_score: 1, estimated_duration: '15 min', signal_type: 'x', status: 'new', contribution_vector: { exercise: 4 } },
  { id: 'a2', title: 'Log your water', summary: 'Two glasses', domain: 'health', risk_level: 'low', impact_score: 1, effort_score: 1, estimated_duration: '', signal_type: 'x', status: 'activated', contribution_vector: { hydration: 2 } },
];

export const topics = [
  { topicId: 'T001', session: 1, position: 1, chapterId: 'prolog', displayLabel: 'Meet Vitana', shortDescription: 'Your companion', explanation: { whatItIs: 'What it is', userBenefit: 'Benefit', whenToUse: 'When', tryThis: 'Try saying hello' }, guidedPracticeTarget: 'orb_overview', businessGate: null },
  { topicId: 'T002', session: 1, position: 2, chapterId: 'prolog', displayLabel: 'Your journey', shortDescription: null, explanation: { whatItIs: 'x', userBenefit: null, whenToUse: null, tryThis: 'Open memory' }, guidedPracticeTarget: 'memory', businessGate: null },
  { topicId: 'T003', session: 2, position: 1, chapterId: 'basics', displayLabel: 'The Vitana Index', shortDescription: 'Five pillars', explanation: { whatItIs: 'x', userBenefit: null, whenToUse: null, tryThis: null }, guidedPracticeTarget: 'vitana_index', businessGate: null },
];

export const guidedState = { ok: true, state: { mode: 'guided', onboardingStatus: 'in_progress', enteredFullModeAt: null, returnedToGuidedAt: null, qualifiedAt: null, completedTopicIds: ['T001'], completedSessionNumbers: [] } };
export const fullState = { ok: true, state: { mode: 'full', onboardingStatus: 'in_progress', enteredFullModeAt: '2026-10-01', returnedToGuidedAt: null, qualifiedAt: null, completedTopicIds: [] } };

export const goalPlan = {
  ok: true,
  plan: {
    id: 'p1',
    goal_text: 'Transform Health',
    plan_summary: 'Sleep first, then strength.',
    start_date: iso(plusDays(-30)),
    target_date: iso(plusDays(120)),
    total_days: 150,
    day: 30,
    days_left: 120,
    status: 'active',
    milestones: [
      { id: 'm1', kind: 'milestone', title: 'First 5k', description: null, day_offset: 60, scheduled_date: iso(plusDays(30)), status: 'pending', sort_order: 1 },
      { id: 'm2', kind: 'milestone', title: 'Sleep 7h', description: null, day_offset: 100, scheduled_date: iso(plusDays(70)), status: 'pending', sort_order: 2 },
    ],
    checkpoints: [
      { id: 'c1', kind: 'checkpoint', title: 'Weekly review', description: 'Look back', day_offset: 7, scheduled_date: iso(plusDays(3)), status: 'pending', sort_order: 1 },
      { id: 'c2', kind: 'checkpoint', title: 'Weekly review', description: 'Look back', day_offset: 14, scheduled_date: iso(plusDays(10)), status: 'pending', sort_order: 2 },
    ],
    habits: [{ id: 'h1', kind: 'habit', title: 'Lights out by 23:00', description: null, day_offset: null, scheduled_date: null, status: 'pending', sort_order: 1 }],
  },
};

export const indexRows = [
  { date: iso(plusDays(-6)), score_total: 300, score_nutrition: 60, score_hydration: 50, score_exercise: 70, score_sleep: 40, score_mental: 80 },
  { date: iso(plusDays(-3)), score_total: 310, score_nutrition: 60, score_hydration: 52, score_exercise: 70, score_sleep: 45, score_mental: 80 },
  { date: iso(now), score_total: 322, score_nutrition: 62, score_hydration: 55, score_exercise: 72, score_sleep: 48, score_mental: 85 },
];

export const matchRows = [{ matched_user_id: 'u-9', match_score: 87.4, match_reasons: [{ code: 'shared_pillar', params: { pillar: 'sleep' } }] }];

export const eventRows = [{ id: 'ev1', title: 'Sunrise yoga', start_time: plusDays(1).toISOString(), created_at: plusDays(-2).toISOString(), virtual_link: null, image_url: null }];

/** Gateway routes of a Full-App member with data everywhere. */
export function fullRoutes(extra: Record<string, Route> = {}): Record<string, Route> {
  return {
    'GET /my-journey': journeyFull,
    'GET /journey/state': fullState,
    'GET /journey-checklist': { ok: true, topics },
    'GET /goal-plan': { ok: true, plan: null },
    'GET /autopilot/recommendations': (r: Req) => (r.query.get('status') === 'new,activated,completed' ? onboarding : { ok: true, recommendations: autopilotRecs }),
    'GET /autopilot/recommendations/count': { ok: true, count: 2 },
    'GET /enrichment-cards': { ok: true, cards: [] },
    ...extra,
  };
}

/** Supabase tables of a member with consent, matches, events and an Index. */
export const fullTables = {
  user_preferences: [{ user_id: 'u-1', ai_data_consent_given: true }],
  daily_matches: matchRows,
  global_community_events: eventRows,
  global_event_participants: [{ event_id: 'ev1' }, { event_id: 'ev1' }],
  vitana_index_scores: indexRows,
  life_compass: [{ id: 'lc1', primary_goal: 'Transform Health', category: 'health', version: 2, target_date: null, target_value: null, target_unit: null }],
};

export const fullRpc = { get_user_profile_by_identifier: () => [{ display_name: 'Mila Novak', avatar_url: null }] };

/** Lets pending promises and React Query settle. */
export const flush = () => new Promise((res) => setTimeout(res, 0));
