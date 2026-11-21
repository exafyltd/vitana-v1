/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — test harness for the native sharing
 * screens. A stateful in-memory Supabase double (select / insert / update / delete / single plus
 * `rpc` and `functions.invoke`, with per-test table failures), a gateway fake that answers by path,
 * a fake device (share sheet, clipboard, link opener, date field), a fake share-card capture, and
 * the provider wrapper. No network: every test imports `../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { Pressable, Text as RNText } from 'react-native';
import { configure } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { registerChatDevice, type ChatDevice, expoChatDevice } from '../../src/ports/chat-device';
import { registerShareCapture } from '../../src/ports/share-capture';

// Lane rule: RNTL's 1000 ms default is too tight for async loads on CI workers.
configure({ asyncUtilTimeout: 5000 });

type Row = Record<string, any>;
type Result = { data: any; error: { code?: string; message: string } | null };

export type SharingDoubleOptions = {
  userId?: string | null;
  tables?: Record<string, Row[]>;
  rpc?: Record<string, (args: any) => unknown>;
  /** Tables whose every query resolves to an error. */
  failTables?: string[];
};

const ok = (data: any = null): Result => ({ data, error: null });

export function createSharingSupabaseDouble(opts: SharingDoubleOptions = {}) {
  const tables: Record<string, Row[]> = Object.fromEntries(Object.entries(opts.tables ?? {}).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  const userId = opts.userId === undefined ? 'u-self' : opts.userId;
  const log: Array<{ table: string; op: 'insert' | 'update' | 'delete'; values?: Row; filters: Array<[string, unknown]> }> = [];
  const fnCalls: Array<{ name: string; body: any }> = [];
  const rpcCalls: Array<{ name: string; args: any }> = [];
  let seq = 0;

  type Filter = ['eq' | 'in', string, unknown];
  const matches = (r: Row, filters: Filter[]) =>
    filters.every(([op, col, v]) => (op === 'eq' ? r[col] === v : Array.isArray(v) && v.includes(r[col])));

  function from(table: string) {
    const filters: Filter[] = [];
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let values: any = null;
    let wantSingle = false;
    let limitN: number | null = null;

    const run = (): Result => {
      if (opts.failTables?.includes(table)) return { data: null, error: { message: `${table} unavailable` } };
      const rows = (tables[table] ??= []);
      if (mode === 'insert') {
        const list = (Array.isArray(values) ? values : [values]).map((v: Row) => ({ id: `${table}-${++seq}`, created_at: '2026-01-01T00:00:00Z', ...v }));
        rows.push(...list);
        log.push({ table, op: 'insert', values: Array.isArray(values) ? { rows: values } : values, filters: [] });
        return ok(wantSingle ? list[0] : list);
      }
      if (mode === 'update') {
        const hit = rows.filter((r) => matches(r, filters));
        hit.forEach((r) => Object.assign(r, values));
        log.push({ table, op: 'update', values, filters: filters.map(([, c, v]) => [c, v]) });
        return ok(wantSingle ? (hit[0] ?? null) : hit);
      }
      if (mode === 'delete') {
        const keep = rows.filter((r) => !matches(r, filters));
        tables[table] = keep;
        log.push({ table, op: 'delete', filters: filters.map(([, c, v]) => [c, v]) });
        return ok(null);
      }
      let out = rows.filter((r) => matches(r, filters));
      if (limitN !== null) out = out.slice(0, limitN);
      return ok(wantSingle ? (out[0] ?? null) : out);
    };

    const builder: any = {
      select: () => builder,
      insert: (v: any) => ((mode = 'insert'), (values = v), builder),
      update: (v: Row) => ((mode = 'update'), (values = v), builder),
      delete: () => ((mode = 'delete'), builder),
      eq: (c: string, v: unknown) => (filters.push(['eq', c, v]), builder),
      in: (c: string, v: unknown) => (filters.push(['in', c, v]), builder),
      order: () => builder,
      limit: (n: number) => ((limitN = n), builder),
      single: () => ((wantSingle = true), builder),
      maybeSingle: () => ((wantSingle = true), builder),
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const auth = {
    getUser: async () => ({ data: { user: userId ? { id: userId, app_metadata: { active_tenant_id: 'tenant-1' } } : null }, error: null }),
    getSession: async () => ({
      data: { session: userId ? { user: { id: userId, app_metadata: { active_tenant_id: 'tenant-1' } }, access_token: `token-${userId}` } : null },
      error: null,
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    startAutoRefresh: () => undefined,
    stopAutoRefresh: () => undefined,
    refreshSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  };

  const rpc = async (name: string, args?: any) => {
    rpcCalls.push({ name, args });
    const handler = opts.rpc?.[name];
    if (!handler) return { data: null, error: null };
    try {
      return { data: handler(args), error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  };

  const functions = {
    invoke: async (name: string, init?: { body?: any }) => {
      fnCalls.push({ name, body: init?.body });
      return { data: { ok: true }, error: null };
    },
  };

  return { client: { auth, from, rpc, functions } as any, tables, log, fnCalls, rpcCalls };
}

export type GatewayReply = { status: number; body?: unknown };
export function fakeGateway(handler: (path: string, method: string) => GatewayReply | undefined = () => undefined) {
  const calls: Array<{ path: string; method: string }> = [];
  const fetchImpl = async (path: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const pathname = path.split('?')[0];
    calls.push({ path: pathname, method });
    const reply = handler(pathname, method) ?? { status: 404, body: { error: 'NOT_FOUND' } };
    const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text: async () => text } as unknown as Response;
  };
  return { fetch: fetchImpl, calls };
}

/** Fake device: records the share sheet, clipboard and link opener; the date field sets a fixed future date. */
export function installFakeDevice(fixedDate: Date = new Date(Date.now() + 2 * 86_400_000)) {
  const shared: Array<{ message?: string; url?: string }> = [];
  const copied: string[] = [];
  const opened: string[] = [];
  const device: ChatDevice = {
    ...expoChatDevice,
    copyText: (text) => void copied.push(text),
    share: async (input) => {
      shared.push(input);
      return 'shared';
    },
    openUrl: async (url) => void opened.push(url),
    DateTimeField: ({ value, mode, onChange, testID }) => (
      <Pressable testID={testID} accessibilityRole="button" onPress={() => onChange(fixedDate)}>
        <RNText>{`${mode}:${value ? value.toISOString() : 'none'}`}</RNText>
      </Pressable>
    ),
  };
  registerChatDevice(device);
  return { shared, copied, opened, fixedDate };
}

/** Fake `react-native-view-shot`: records each capture and answers a file path. */
export function installFakeCapture() {
  const captures: Array<{ options: unknown }> = [];
  registerShareCapture({
    captureRef: async (_ref, options) => {
      captures.push({ options });
      return 'file:///cache/share-card.png';
    },
  });
  return { captures };
}

afterEach(() => {
  registerChatDevice(null);
  registerShareCapture(null);
});

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

/** Provider wrapper for the sharing screens. Installs the Supabase and gateway doubles first. */
export function makeSharingWrapper(opts: { client: unknown; gateway?: ReturnType<typeof fakeGateway>; language?: string }) {
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

export function campaignRow(over: Partial<Row> = {}): Row {
  return {
    id: 'camp-1',
    user_id: 'u-self',
    name: 'Spring Wellness Launch',
    description: 'Three weeks of posts',
    status: 'draft',
    start_date: '2026-03-01T00:00:00Z',
    end_date: '2026-03-21T00:00:00Z',
    cover_image_url: null,
    target_channels: { email: true, whatsapp: true },
    distribution_config: { template_id: 'launch', smart_scheduling_enabled: true },
    metadata: {},
    created_at: '2026-02-01T00:00:00Z',
    ...over,
  };
}

export function postRow(over: Partial<Row> = {}): Row {
  return {
    id: 'post-1',
    campaign_id: 'camp-1',
    user_id: 'u-self',
    title: 'Teaser post',
    description: 'First teaser',
    content: 'First teaser',
    status: 'draft',
    published_at: null,
    scheduled_for: null,
    channels: ['email'],
    created_at: '2026-02-02T00:00:00Z',
    ...over,
  };
}

export function channelRow(over: Partial<Row> = {}): Row {
  return {
    id: 'ch-email',
    user_id: 'u-self',
    channel_type: 'email',
    channel_name: 'Email',
    is_connected: true,
    is_active: true,
    ...over,
  };
}
