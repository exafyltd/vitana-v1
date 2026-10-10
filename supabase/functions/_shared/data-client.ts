// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Aurora cutover, option B (VTID-05023, part 5): edge-function data client.
 *
 * Every edge function builds its supabase-js client through
 * `createDataClient(createClient, url, key, options)` instead of calling
 * `createClient(url, key, options)` directly (scripts/check-edge-data-client.mjs
 * fails CI on a direct call).
 *
 * When `DATA_API_URL` is set, every PostgREST request the client makes
 * (`${SUPABASE_URL}/rest/v1/...`) goes to `${DATA_API_URL}/rest/v1/...` (the
 * public PostgREST-Aurora proxy). Auth, Storage, Functions and Realtime stay on
 * Supabase unchanged. This is the same split as the app's
 * src/integrations/supabase/data-routing.ts (kept as a copy: edge functions are
 * bundled from supabase/functions only and cannot import from src/).
 *
 * No silent fallback: when `CUTOVER_DONE=true` and `DATA_API_URL` is unset or
 * blank, client creation throws. Before the cutover (both unset) the client is
 * created exactly as today: same arguments, no fetch wrapper.
 *
 * The caller passes its own `createClient` so each function keeps the
 * supabase-js version it imports today (the functions pin different esm.sh
 * versions; importing one here would introduce version skew).
 */

const trimSlash = (s: string) => s.replace(/\/+$/, '');

type EnvGetter = (name: string) => string | undefined;

const denoEnv: EnvGetter = (name) => {
  const deno = (globalThis as any).Deno;
  return deno?.env?.get?.(name);
};

export class DataApiNotConfiguredError extends Error {
  constructor() {
    super(
      '[data-client] CUTOVER_DONE=true but DATA_API_URL is not set: refusing to send ' +
        'database traffic to Supabase (VTID-05023, no silent fallback). Set the ' +
        'DATA_API_URL edge secret to the PostgREST-Aurora proxy host.',
    );
    this.name = 'DataApiNotConfiguredError';
  }
}

/**
 * Resolve the data URL from the environment. Returns '' when database traffic
 * should stay on Supabase (pre-cutover); throws when the cutover is marked done
 * but no data URL is configured.
 */
export function resolveDataApiUrl(env: EnvGetter = denoEnv): string {
  const data = (env('DATA_API_URL') ?? '').trim();
  if (data) return trimSlash(data);
  if ((env('CUTOVER_DONE') ?? '').trim() === 'true') throw new DataApiNotConfiguredError();
  return '';
}

export function createDataFetch(
  supabaseUrl: string,
  dataApiUrl: string | undefined,
  baseFetch: typeof fetch = (input, init) => fetch(input, init),
): typeof fetch {
  const data = dataApiUrl ? trimSlash(dataApiUrl.trim()) : '';
  if (!data) return baseFetch;
  const restPrefix = `${trimSlash(supabaseUrl)}/rest/v1`;

  const rewrite = (url: string): string | null => {
    if (url === restPrefix) return `${data}/rest/v1`;
    const next = url.charAt(restPrefix.length);
    if (url.startsWith(restPrefix) && (next === '/' || next === '?')) {
      return `${data}/rest/v1${url.slice(restPrefix.length)}`;
    }
    return null;
  };

  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const target = rewrite(url);
    if (target === null) return baseFetch(input, init);
    if (typeof input === 'string' || input instanceof URL) return baseFetch(target, init);
    // A Request carries method, headers and body. `new Request(url, request)`
    // does not copy them reliably in every runtime, so copy them explicitly.
    return copyRequest(target, input).then((req) => baseFetch(req, init));
  };
}

async function copyRequest(url: string, src: Request): Promise<Request> {
  const method = src.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await src.arrayBuffer();
  return new Request(url, {
    method,
    headers: src.headers,
    body,
    redirect: src.redirect,
    signal: src.signal,
  });
}

type AnyOptions = Record<string, any> & { global?: Record<string, any> };

/**
 * Drop-in replacement for `createClient(url, key, options)`.
 * Pass the function's own imported `createClient` as the first argument.
 */
// The client type C is inferred from the caller's own `createClient`, so each
// function gets exactly the client type a direct call gave it (ReturnType<>
// of the generic createClient would degrade it).
export function createDataClient<C>(
  createClient: (url: string, key: string, options?: any) => C,
  supabaseUrl: string,
  supabaseKey: string,
  options?: AnyOptions,
  env: EnvGetter = denoEnv,
): C {
  const dataApiUrl = resolveDataApiUrl(env);
  // Pre-cutover: byte-for-byte the call the function made before VTID-05023.
  if (!dataApiUrl) {
    return options === undefined
      ? createClient(supabaseUrl, supabaseKey)
      : createClient(supabaseUrl, supabaseKey, options);
  }
  const opts: AnyOptions = options ?? {};
  const baseFetch = typeof opts.global?.fetch === 'function' ? opts.global.fetch : undefined;
  const dataFetch = createDataFetch(supabaseUrl, dataApiUrl, baseFetch);
  return createClient(supabaseUrl, supabaseKey, {
    ...opts,
    global: { ...opts.global, fetch: dataFetch },
  });
}
