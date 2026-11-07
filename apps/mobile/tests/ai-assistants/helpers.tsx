/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — test harness for
 * `/assistant` and the AI-assistant connect flow. An in-memory Supabase
 * double that RECORDS every write (insert / update / functions.invoke) and a
 * gateway fake that records every request (method, path, parsed body) and
 * answers by `METHOD path` or bare path. Nothing reaches a network:
 * `../helpers/no-network` replaces `fetch` with a thrower and both doubles
 * are installed through the shell's test hooks. Writes are asserted as BUILT
 * requests — nothing is ever fired at a live backend (requirements R5.2).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactElement, ReactNode } from 'react';
import { act, configure, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { UIProvider } from '../../src/ports/ui';
import type { UserPreferences } from '../../src/screens/ai-assistants/data/requests';

// Every lane test imports this harness: give findBy*/waitFor 5 s instead of
// RNTL's 1 s default so the suite holds under default-worker load.
configure({ asyncUtilTimeout: 5000 });
// Chained 5 s waits must fit inside the test's own budget (Jest default 5 s).
jest.setTimeout(30000);

type Row = Record<string, any>;
type Result = { data: any; error: { message: string; code?: string } | null };
const ok = (data: any = null): Result => ({ data, error: null });

export const PREFS: UserPreferences = {
  id: 'p-1',
  user_id: 'u-1',
  autopilot_enabled: true,
  autopilot_max_actions_per_day: 5,
  autopilot_quiet_hours_start: '22:00',
  autopilot_quiet_hours_end: '07:00',
  autopilot_priority_filter: 'all',
  autopilot_categories: { health: true, community: true, discovery: false, memory: true },
  stt_language: 'de-DE',
  stt_instant_enabled: true,
  stt_auto_punctuation: true,
  stt_sensitivity: 0.5,
  tts_voice: null,
  tts_gender: 'female',
  tts_character: 'default',
  tts_speed: 1,
  tts_pitch: 1,
  tts_volume: 80,
  ai_model: 'gpt-4',
  ai_temperature: 0.7,
  ai_response_length: 'medium',
  store_voice_recordings: false,
  auto_delete_recordings_days: 30,
  auto_greeting_enabled: true,
  greeting_frequency: 'session',
  greeting_message_types: ['time_greeting', 'motivational'],
  interests: [],
  wellness_goals: [],
  shorts_filtering_enabled: false,
  ai_data_consent_given: true,
  ai_data_consent_date: '2026-10-01T00:00:00Z',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

export type Write = { kind: 'insert' | 'update'; table: string; values: Row; filters: Array<[string, any]> };

export function createAssistantSupabase(opts: { userId?: string; prefs?: Partial<UserPreferences> | null; failRead?: boolean; failUpdate?: boolean; greeting?: Result; hold?: Promise<void> } = {}) {
  const userId = opts.userId ?? 'u-1';
  const tables: Record<string, Row[]> = { user_preferences: opts.prefs === null ? [] : [{ ...PREFS, user_id: userId, ...(opts.prefs ?? {}) }] };
  const writes: Write[] = [];
  const invokes: Array<{ name: string; options: any }> = [];
  const session = { access_token: `token-${userId}`, refresh_token: 'r', user: { id: userId, app_metadata: {}, user_metadata: {} } };

  function from(table: string) {
    const filters: Array<[string, any]> = [];
    let write: Write | null = null;
    const run = (): Result => {
      if (write) {
        writes.push({ ...write, filters: [...filters] });
        if (write.kind === 'update' && opts.failUpdate) return { data: null, error: { message: 'update failed' } };
        const rows = (tables[table] ??= []);
        if (write.kind === 'update') rows.filter((r) => filters.every(([c, v]) => r[c] === v)).forEach((r) => Object.assign(r, write?.values));
        else rows.push({ ...PREFS, ...write.values });
        return ok(write.kind === 'insert' ? [rows[rows.length - 1]] : null);
      }
      if (opts.failRead) return { data: null, error: { message: `${table} failed` } };
      return ok((tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v)));
    };
    const builder: any = {
      select: () => builder,
      eq: (c: string, v: any) => (filters.push([c, v]), builder),
      update: (values: Row) => ((write = { kind: 'update', table, values, filters: [] }), builder),
      insert: (values: Row) => ((write = { kind: 'insert', table, values, filters: [] }), builder),
      single: async () => {
        const r = run();
        const first = Array.isArray(r.data) ? r.data[0] : r.data;
        return r.error ? r : first ? ok(first) : { data: null, error: { message: 'not found' } };
      },
      maybeSingle: async () => {
        if (opts.hold) await opts.hold;
        const r = run();
        return r.error ? r : ok(Array.isArray(r.data) ? (r.data[0] ?? null) : r.data);
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const functions = {
    invoke: jest.fn(async (name: string, options: any) => {
      invokes.push({ name, options });
      return opts.greeting ?? ok({ greeting: '<model-greeting>', context: {} });
    }),
  };

  const auth = {
    getSession: jest.fn(async () => ok({ session })),
    getUser: jest.fn(async () => ok({ user: session.user })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
    refreshSession: jest.fn(async () => ok({ session })),
    signOut: jest.fn(async () => ({ error: null })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  };

  return { client: { auth, from: jest.fn(from), functions, rpc: jest.fn(async () => ok(null)) } as any, writes, invokes, tables };
}

export type GatewayCall = { method: string; path: string; body: unknown; headers: Record<string, string> };

/** Answers `"METHOD /path"` first, then the bare `"/path"`. A route value of `{ __status, __body }` answers that status; a function is called per request; a Promise is awaited (holds the answer). */
export function createGateway(routes: Record<string, unknown> = {}) {
  const calls: GatewayCall[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    const headers: Record<string, string> = {};
    new Headers(init.headers ?? undefined).forEach((v, k) => {
      headers[k] = v;
    });
    calls.push({ method, path, body, headers });
    const key = [`${method} ${path}`, path].find((k) => Object.prototype.hasOwnProperty.call(routes, k));
    let value = key ? routes[key] : undefined;
    if (typeof value === 'function') value = (value as (b: unknown) => unknown)(body);
    if (value instanceof Promise) value = await value;
    const status = value && typeof value === 'object' && '__status' in (value as Row) ? (value as Row).__status : value === undefined ? 404 : 200;
    const payload = value && typeof value === 'object' && '__body' in (value as Row) ? (value as Row).__body : value;
    return { ok: status >= 200 && status < 300, status, text: async () => (payload === undefined ? '' : JSON.stringify(payload)) } as unknown as Response;
  };
  return { fetch, calls, writes: () => calls.filter((c) => c.method !== 'GET') };
}

/** The `/vaea/config` row the referrals tab reads. */
export const VAEA_CONFIG = {
  user_id: 'u-1',
  tenant_id: 't-maxina',
  receive_recommendations: true,
  give_recommendations: false,
  make_money_goal: false,
  autonomy_default: 'draft_to_user',
  autonomy_by_channel: {},
  voice_samples: [],
  disclosure_text: 'Affiliate link',
  expertise_zones: ['sleep', 'longevity'],
  excluded_categories: [],
  blocked_counterparties: [],
  max_replies_per_day: 5,
  min_minutes_between_replies: 30,
  mesh_scope: 'maxina_only',
};

/**
 * Waits (up to 5 s) for `check` to stop throwing, letting timers and the query
 * cache settle inside act() between tries. Used for "X went away" assertions,
 * where nothing new appears that findBy* could wait for.
 */
export async function settleUntil(check: () => void): Promise<void> {
  let last: unknown;
  for (let i = 0; i < 50; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    try {
      check();
      return;
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

const clients: QueryClient[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.clear();
});

export function renderAssistant(
  ui: ReactElement,
  opts: { supabase: ReturnType<typeof createAssistantSupabase>; gateway?: ReturnType<typeof createGateway>; language?: string; direction?: 'ltr' | 'rtl' },
) {
  const gateway = opts.gateway ?? createGateway({ 'GET /vaea/config': { ok: true, config: VAEA_CONFIG } });
  __setSupabaseForTests(opts.supabase.client);
  // The shell gateway adds the bearer token and the /api/v1 prefix; the fake sees the same.
  __setGatewayForTests(((path: string, init: RequestInit = {}) =>
    gateway.fetch(`/api/v1${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), authorization: 'Bearer token-u-1' } })) as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  clients.push(qc);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider initialMode="light">
          <AuthProvider client={opts.supabase.client}>
            <LanguageProvider initialLanguage={opts.language ?? 'de-DE'}>
              <UIProvider colorScheme="light" direction={opts.direction ?? 'ltr'}>
                {children}
              </UIProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }
  return { ...render(ui, { wrapper: Wrapper }), gateway, qc };
}
