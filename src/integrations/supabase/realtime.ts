/**
 * Realtime routing (VTID-05023, Aurora cutover option B, part 7a).
 *
 * Every realtime channel in the app (postgres_changes, broadcast, presence)
 * is created through this module, never through `supabase.channel(...)`
 * directly (`scripts/check-realtime-helper.mjs` enforces that in CI).
 *
 * - `VITE_REALTIME_URL` unset (today): every helper delegates to the
 *   supabase-js client — `supabase.channel`, `supabase.removeChannel`, … —
 *   so behaviour is exactly what it was before this module existed.
 * - `VITE_REALTIME_URL` set (e.g. `wss://realtime.vitanaland.com/socket`, the
 *   self-hosted Supabase Realtime running against Aurora): every channel lives
 *   on one separate `RealtimeClient` against that host (realtime-js appends
 *   `/websocket`, as it does for `…/realtime/v1`). It sends the anon key as the
 *   `apikey` param and the member's current access token via `setAuth`, which
 *   is re-called on sign-in, token refresh and sign-out. Auth, REST, storage
 *   and functions stay on the supabase-js client.
 *
 * No silent fallback: once `VITE_REALTIME_URL` is set, a client that cannot be
 * created is logged with console.error (tag `[realtime-routing]`) and channels
 * become inert (subscribe reports CHANNEL_ERROR) — they are never quietly sent
 * to Supabase's own Realtime, which would not see Aurora's writes.
 */
import {
  RealtimeClient,
  type RealtimeChannel,
  type RealtimeChannelOptions,
  type RealtimeClientOptions,
  type RealtimeRemoveChannelResponse,
} from '@supabase/supabase-js';
import { supabase, SUPABASE_PUBLISHABLE_KEY } from './client';

export const REALTIME_LOG_TAG = '[realtime-routing]';

/** The slice of the supabase-js client this module uses (injectable for tests). */
export interface RealtimeSupabaseLike {
  channel(name: string, opts?: RealtimeChannelOptions): RealtimeChannel;
  removeChannel(channel: RealtimeChannel): Promise<RealtimeRemoveChannelResponse>;
  removeAllChannels(): Promise<RealtimeRemoveChannelResponse[]>;
  getChannels(): RealtimeChannel[];
  realtime: { setAuth(token?: string | null): Promise<void> };
  auth: {
    getSession(): Promise<{ data: { session: { access_token?: string } | null } }>;
    onAuthStateChange(
      cb: (event: string, session: { access_token?: string } | null) => void,
    ): unknown;
  };
}

/** Same shape as RealtimeClient (injectable for tests). */
export type RealtimeClientLike = Pick<
  RealtimeClient,
  'channel' | 'removeChannel' | 'removeAllChannels' | 'getChannels' | 'setAuth'
>;

export type RealtimeClientFactory = (endpoint: string, options: RealtimeClientOptions) => RealtimeClientLike;

export interface RealtimeRouterDeps {
  supabase: RealtimeSupabaseLike;
  /** VITE_REALTIME_URL; empty/undefined = delegate to supabase-js. */
  realtimeUrl: string | undefined;
  anonKey: string;
  createClient?: RealtimeClientFactory;
  /** Extra socket params (client.ts uses eventsPerSecond: 10). */
  params?: Record<string, unknown>;
}

export interface RealtimeRouter {
  /** 'supabase' = today's behaviour, 'routed' = separate client, 'broken' = set but unusable. */
  readonly mode: 'supabase' | 'routed' | 'broken';
  readonly endpoint: string | null;
  channel(name: string, opts?: RealtimeChannelOptions): RealtimeChannel;
  removeChannel(channel: RealtimeChannel): Promise<RealtimeRemoveChannelResponse>;
  removeAllChannels(): Promise<RealtimeRemoveChannelResponse[]>;
  getChannels(): RealtimeChannel[];
  setAuth(token?: string | null): Promise<void>;
}

const defaultFactory: RealtimeClientFactory = (endpoint, options) => new RealtimeClient(endpoint, options);

/** ws(s) URL without trailing slash; http(s) is accepted and converted. Throws on anything else. */
export function normalizeRealtimeUrl(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol === 'https:') url.protocol = 'wss:';
  else if (url.protocol === 'http:') url.protocol = 'ws:';
  if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
    throw new Error(`VITE_REALTIME_URL must be a ws(s):// or http(s):// URL, got ${url.protocol}`);
  }
  return url.href.replace(/\/+$/, '');
}

const INERT = Symbol('inert-realtime-channel');

function inertChannel(name: string, reason: Error): RealtimeChannel {
  const ch = {
    [INERT]: true,
    topic: `realtime:${name}`,
    state: 'errored',
    on() {
      return ch;
    },
    subscribe(cb?: (status: string, err?: Error) => void) {
      console.error(`${REALTIME_LOG_TAG} channel "${name}" cannot subscribe: ${reason.message}`);
      if (cb) setTimeout(() => cb('CHANNEL_ERROR', reason), 0);
      return ch;
    },
    send: () => Promise.resolve('error'),
    track: () => Promise.resolve('error'),
    untrack: () => Promise.resolve('error'),
    presenceState: () => ({}),
    unsubscribe: () => Promise.resolve('ok'),
  };
  return ch as unknown as RealtimeChannel;
}

const isInert = (ch: unknown): boolean => !!ch && typeof ch === 'object' && INERT in ch;

export function createRealtimeRouter(deps: RealtimeRouterDeps): RealtimeRouter {
  const { supabase: sb, anonKey } = deps;
  const raw = deps.realtimeUrl?.trim();

  if (!raw) {
    return {
      mode: 'supabase',
      endpoint: null,
      channel: (name, opts) => sb.channel(name, opts),
      removeChannel: (ch) => sb.removeChannel(ch),
      removeAllChannels: () => sb.removeAllChannels(),
      getChannels: () => sb.getChannels(),
      setAuth: (token) => sb.realtime.setAuth(token ?? undefined),
    };
  }

  let client: RealtimeClientLike | null = null;
  let endpoint: string | null = null;
  let failure: Error | null = null;
  try {
    endpoint = normalizeRealtimeUrl(raw);
    client = (deps.createClient ?? defaultFactory)(endpoint, {
      params: { apikey: anonKey, ...(deps.params ?? {}) },
      // Same contract as supabase-js: the member's token when signed in, else the anon key.
      accessToken: async () => {
        const { data } = await sb.auth.getSession();
        return data.session?.access_token ?? anonKey;
      },
    });
  } catch (err) {
    failure = err instanceof Error ? err : new Error(String(err));
    client = null;
    console.error(
      `${REALTIME_LOG_TAG} VITE_REALTIME_URL is set (${raw}) but the realtime client could not be created; ` +
        `realtime channels are disabled (no fallback to Supabase Realtime): ${failure.message}`,
    );
  }

  const authorize = (token: string | null | undefined) => {
    if (!client) return Promise.resolve();
    return client.setAuth(token || anonKey).catch((err: unknown) => {
      console.error(`${REALTIME_LOG_TAG} setAuth failed:`, err);
    });
  };

  // Bumped by every auth event / explicit setAuth, so a slow initial session
  // read can never overwrite a newer token with an older one.
  let authEpoch = 0;
  if (client) {
    void sb.auth
      .getSession()
      .then(({ data }) => (authEpoch === 0 ? authorize(data.session?.access_token) : undefined))
      .catch((err: unknown) => console.error(`${REALTIME_LOG_TAG} initial session read failed:`, err));
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        authEpoch++;
        void authorize(null);
      } else if (session?.access_token) {
        authEpoch++;
        void authorize(session.access_token);
      }
    });
  }

  return {
    mode: client ? 'routed' : 'broken',
    endpoint,
    channel(name, opts) {
      if (!client) return inertChannel(name, failure ?? new Error('realtime client unavailable'));
      return client.channel(name, opts);
    },
    removeChannel(ch) {
      if (isInert(ch)) return Promise.resolve('ok');
      if (client && client.getChannels().includes(ch)) return client.removeChannel(ch);
      // Not one of ours (should not happen once routed) — let its owner remove it.
      return sb.removeChannel(ch);
    },
    removeAllChannels() {
      return client ? client.removeAllChannels() : Promise.resolve([]);
    },
    getChannels() {
      return client ? client.getChannels() : [];
    },
    setAuth(token) {
      authEpoch++;
      return authorize(token);
    },
  };
}

let router: RealtimeRouter | null = null;

/** The app-wide router, created on first use from VITE_REALTIME_URL. */
export function getRealtimeRouter(): RealtimeRouter {
  if (!router) {
    const realtimeUrl = import.meta.env.VITE_REALTIME_URL as string | undefined;
    router = createRealtimeRouter({
      supabase: supabase as unknown as RealtimeSupabaseLike,
      realtimeUrl,
      // Read only when routed, so unit tests that mock the client module keep working unchanged.
      anonKey: realtimeUrl?.trim() ? SUPABASE_PUBLISHABLE_KEY : '',
      params: { eventsPerSecond: 10 },
    });
  }
  return router;
}

/** Test hook: forget the app-wide router so the next call re-reads the env. */
export function __resetRealtimeRouterForTests(): void {
  router = null;
}

/** Drop-in for `supabase.channel(name, opts)`. */
export function realtimeChannel(name: string, opts?: RealtimeChannelOptions): RealtimeChannel {
  return getRealtimeRouter().channel(name, opts);
}

/** Drop-in for `supabase.removeChannel(channel)`. */
export function removeRealtimeChannel(channel: RealtimeChannel): Promise<RealtimeRemoveChannelResponse> {
  return getRealtimeRouter().removeChannel(channel);
}

/** Drop-in for `supabase.removeAllChannels()`. */
export function removeAllRealtimeChannels(): Promise<RealtimeRemoveChannelResponse[]> {
  return getRealtimeRouter().removeAllChannels();
}

/** Drop-in for `supabase.getChannels()`. */
export function getRealtimeChannels(): RealtimeChannel[] {
  return getRealtimeRouter().getChannels();
}

/** Drop-in for `supabase.realtime.setAuth(token)`. */
export function setRealtimeAuth(token?: string | null): Promise<void> {
  return getRealtimeRouter().setAuth(token);
}
