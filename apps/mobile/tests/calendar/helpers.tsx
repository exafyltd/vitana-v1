/**
 * VTID-05530 (native-wave2-events-calendar-r3/calendar-reminders) — test harness for the native
 * calendar and reminders screens: a small in-memory Supabase double (auth, rpc, and the
 * `calendar_events` read the entry deep link makes), a gateway fake that answers by path and
 * method and records every call (body and the active-role header), the calendar and reminder
 * fixtures, and the provider wrapper. No network: every test imports `../helpers/no-network`
 * first and the Supabase and gateway seams are replaced here.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { configure } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';

// Lane rule: RNTL's 1000 ms default is too tight for async loads on CI workers.
configure({ asyncUtilTimeout: 5000 });

type Row = Record<string, any>;

export function createSupabaseDouble(opts: { userId?: string | null; tables?: Record<string, Row[]> } = {}) {
  const tables = opts.tables ?? {};
  const userId = opts.userId === undefined ? 'u-self' : opts.userId;
  function from(table: string) {
    const filters: Array<[string, unknown]> = [];
    const builder: any = {
      select: () => builder,
      eq: (c: string, v: unknown) => (filters.push([c, v]), builder),
      maybeSingle: async () => {
        const rows = (tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v));
        return { data: rows[0] ?? null, error: null };
      },
    };
    return builder;
  }
  const auth = {
    getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }),
    getSession: async () => ({
      data: { session: userId ? { user: { id: userId }, access_token: `token-${userId}` } : null },
      error: null,
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    startAutoRefresh: () => undefined,
    stopAutoRefresh: () => undefined,
    refreshSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  };
  const rpc = async () => ({ data: null, error: null });
  return { client: { auth, from, rpc } as any };
}

export type GatewayReply = { status: number; body?: unknown };
export type GatewayCall = { path: string; query: URLSearchParams; method: string; body: any; role: string | null };

/** Gateway fake: `handler` answers each call by pathname and method; an unmatched call answers 404. */
export function fakeGateway(handler: (path: string, method: string, call: GatewayCall) => GatewayReply | undefined = () => undefined) {
  const calls: GatewayCall[] = [];
  const fetchImpl = async (path: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const [pathname, search = ''] = path.split('?');
    let body: any = null;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const headers = new Headers((init.headers ?? undefined) as any);
    const call: GatewayCall = { path: pathname, query: new URLSearchParams(search), method, body, role: headers.get('x-vitana-active-role') };
    calls.push(call);
    const reply = handler(pathname, method, call) ?? { status: 404, body: { ok: false, error: 'NOT_FOUND' } };
    const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text: async () => text, json: async () => (text ? JSON.parse(text) : null) } as unknown as Response;
  };
  return { fetch: fetchImpl, calls, called: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path) };
}

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

export function makeWrapper(opts: { client: unknown; gateway?: ReturnType<typeof fakeGateway>; language?: string }) {
  __setSupabaseForTests(opts.client as never);
  if (opts.gateway) __setGatewayForTests(opts.gateway.fetch as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  qcs.push(qc);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider client={opts.client as never}>
            <TenantProvider>
              <LanguageProvider initialLanguage={opts.language ?? 'en-US'}>{children}</LanguageProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

// ── fixtures ────────────────────────────────────────────────────────────

/** Today at the given local hour and minute, as an ISO string. */
export function todayAt(hour: number, minute = 0, addDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function entryRow(over: Partial<Row> = {}): Row {
  return {
    id: 'ev-1',
    title: 'Morning walk',
    description: null,
    start_time: todayAt(10),
    end_time: todayAt(11),
    location: null,
    event_type: 'personal',
    status: 'confirmed',
    source_type: 'manual',
    source_ref_type: null,
    source_ref_id: null,
    role_context: 'community',
    completion_status: null,
    completed_at: null,
    wellness_tags: null,
    pillar: null,
    rrule: null,
    emoji: null,
    attendees_count: null,
    metadata: null,
    ...over,
  };
}

/** A window item as `GET /api/v1/calendar/events/window` returns it. */
export function windowItem(over: Partial<Row> = {}, event: Partial<Row> | null = {}): Row {
  const e = event === null ? null : entryRow(event);
  return {
    id: e ? `${e.id}:0` : 'busy-1',
    event_id: e ? e.id : 'busy-1',
    start_time: e ? e.start_time : todayAt(15),
    end_time: e ? e.end_time : todayAt(16),
    busy: e === null,
    occurrence_index: null,
    event: e,
    reminders: [{ kind: 'before', minutes: 30 }],
    ...over,
  };
}

export function reminderRow(over: Partial<Row> = {}): Row {
  return {
    id: 'rem-1',
    user_id: 'u-self',
    tenant_id: 't-1',
    action_text: 'Take magnesium',
    spoken_message: 'Time for your magnesium',
    description: null,
    next_fire_at: todayAt(20),
    user_tz: 'UTC',
    status: 'pending',
    delivery_via: null,
    fired_at: null,
    acked_at: null,
    snooze_count: 0,
    tts_audio_b64: null,
    tts_voice: null,
    tts_lang: null,
    calendar_event_id: null,
    created_via: 'ui',
    created_at: todayAt(8),
    updated_at: todayAt(8),
    ...over,
  };
}
