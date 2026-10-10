// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VTID-05023 part 5: edge data client routing.
 * Run: deno test supabase/functions/_shared/data-client.test.ts
 * (no network, no permissions needed: env is injected, fetch is a recorder).
 */
import {
  createDataClient,
  createDataFetch,
  DataApiNotConfiguredError,
  resolveDataApiUrl,
} from './data-client.ts';

const SUPA = 'https://abc.supabase.co';
const DATA = 'https://data.vitanaland.com';

function eq(actual: unknown, expected: unknown, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

function throws(fn: () => unknown, ctor: new (...a: never[]) => Error) {
  try {
    fn();
  } catch (e) {
    if (e instanceof ctor) return;
    throw new Error(`threw wrong error: ${e}`);
  }
  throw new Error('expected a throw');
}

type Call = { input: RequestInfo | URL; init?: RequestInit };
function recorder() {
  const calls: Call[] = [];
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ input, init });
    return Promise.resolve(new Response('ok'));
  };
  return { calls, fetchFn };
}

const env = (vars: Record<string, string | undefined>) => (name: string) => vars[name];

Deno.test('rewrites /rest/v1 string URLs to DATA_API_URL', async () => {
  const { calls, fetchFn } = recorder();
  const f = createDataFetch(SUPA, DATA + '/', fetchFn);
  const init = { method: 'POST', headers: { apikey: 'k' }, body: '{"a":1}' };
  await f(`${SUPA}/rest/v1/profiles?select=id`, init);
  await f(`${SUPA}/rest/v1`);
  await f(`${SUPA}/rest/v1?x=1`);
  eq(calls.map((c) => c.input), [
    `${DATA}/rest/v1/profiles?select=id`,
    `${DATA}/rest/v1`,
    `${DATA}/rest/v1?x=1`,
  ]);
  eq(calls[0].init === init, true, 'init passed through unchanged');
});

Deno.test('rewrites /rest/v1 URL objects', async () => {
  const { calls, fetchFn } = recorder();
  const f = createDataFetch(SUPA, DATA, fetchFn);
  await f(new URL(`${SUPA}/rest/v1/rpc/do_it`), { method: 'POST' });
  eq(calls[0].input, `${DATA}/rest/v1/rpc/do_it`);
  eq(calls[0].init?.method, 'POST');
});

Deno.test('rewrites Request inputs keeping method, headers and body', async () => {
  const { calls, fetchFn } = recorder();
  const f = createDataFetch(SUPA, DATA, fetchFn);
  const req = new Request(`${SUPA}/rest/v1/items?id=eq.1`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer jwt', Prefer: 'return=representation' },
    body: JSON.stringify({ name: 'x' }),
  });
  await f(req);
  const sent = calls[0].input as Request;
  eq(sent instanceof Request, true);
  eq(sent.url, `${DATA}/rest/v1/items?id=eq.1`);
  eq(sent.method, 'PATCH');
  eq(sent.headers.get('authorization'), 'Bearer jwt');
  eq(sent.headers.get('prefer'), 'return=representation');
  eq(await sent.text(), '{"name":"x"}');

  const get = new Request(`${SUPA}/rest/v1/items`, { headers: { apikey: 'k' } });
  await f(get);
  const sentGet = calls[1].input as Request;
  eq(sentGet.method, 'GET');
  eq(sentGet.headers.get('apikey'), 'k');
});

Deno.test('auth, storage, functions, realtime and look-alike paths stay on Supabase', async () => {
  const { calls, fetchFn } = recorder();
  const f = createDataFetch(SUPA, DATA, fetchFn);
  const untouched = [
    `${SUPA}/auth/v1/user`,
    `${SUPA}/storage/v1/object/public/b/x.png`,
    `${SUPA}/functions/v1/vertex-auth`,
    `${SUPA}/realtime/v1/websocket`,
    `${SUPA}/rest/v10/x`,
    `${SUPA}/rest/v1x`,
    `https://other.example.com/rest/v1/x`,
  ];
  for (const u of untouched) await f(u);
  const req = new Request(`${SUPA}/auth/v1/token?grant_type=password`, { method: 'POST', body: '{}' });
  await f(req);
  eq(calls.map((c) => (c.input instanceof Request ? c.input.url : String(c.input))), [
    ...untouched,
    `${SUPA}/auth/v1/token?grant_type=password`,
  ]);
  eq(calls[calls.length - 1].input === req, true, 'non-rest Request passed through as-is');
});

Deno.test('pass-through when DATA_API_URL is unset or blank', async () => {
  const { calls, fetchFn } = recorder();
  eq(createDataFetch(SUPA, undefined, fetchFn) === fetchFn, true);
  eq(createDataFetch(SUPA, '   ', fetchFn) === fetchFn, true);
  await createDataFetch(SUPA, '', fetchFn)(`${SUPA}/rest/v1/x`);
  eq(calls[0].input, `${SUPA}/rest/v1/x`);
});

Deno.test('resolveDataApiUrl: unset → "", set → trimmed, CUTOVER_DONE=true without it → throws', () => {
  eq(resolveDataApiUrl(env({})), '');
  eq(resolveDataApiUrl(env({ CUTOVER_DONE: 'false' })), '');
  eq(resolveDataApiUrl(env({ DATA_API_URL: ` ${DATA}/ ` })), DATA);
  eq(resolveDataApiUrl(env({ DATA_API_URL: DATA, CUTOVER_DONE: 'true' })), DATA);
  throws(() => resolveDataApiUrl(env({ CUTOVER_DONE: 'true' })), DataApiNotConfiguredError);
  throws(() => resolveDataApiUrl(env({ CUTOVER_DONE: 'true', DATA_API_URL: '  ' })), DataApiNotConfiguredError);
});

type Args = any[];
function fakeCreateClient() {
  const calls: Args[] = [];
  const fn = (...args: any[]) => {
    calls.push(args);
    return { client: true };
  };
  return { calls, fn: fn as (url: string, key: string, options?: Record<string, unknown>) => { client: boolean } };
}

Deno.test('createDataClient pre-cutover: identical arguments to a direct createClient call', () => {
  const { calls, fn } = fakeCreateClient();
  const opts = { auth: { persistSession: false } };
  createDataClient(fn, SUPA, 'service', undefined, env({}));
  createDataClient(fn, SUPA, 'anon', opts, env({}));
  eq(calls[0].length, 2, 'no options argument added');
  eq(calls[0], [SUPA, 'service']);
  eq(calls[1][2] === opts, true, 'options object passed through untouched');
});

Deno.test('createDataClient with DATA_API_URL: keeps key and options, injects the data fetch', async () => {
  const { calls, fn } = fakeCreateClient();
  const headers = { Authorization: 'Bearer user-jwt' };
  createDataClient(fn, SUPA, 'anon', { auth: { persistSession: false }, global: { headers } }, env({ DATA_API_URL: DATA }));
  const [url, key, options] = calls[0];
  eq(url, SUPA, 'client URL stays Supabase (auth/storage/functions)');
  eq(key, 'anon');
  eq(options.auth, { persistSession: false });
  eq(options.global.headers === headers, true);
  eq(typeof options.global.fetch, 'function');

  // A caller-supplied fetch is used as the base fetch for both kinds of traffic.
  const { calls: sent, fetchFn } = recorder();
  createDataClient(fn, SUPA, 'svc', { global: { fetch: fetchFn } }, env({ DATA_API_URL: DATA, CUTOVER_DONE: 'true' }));
  const injected = calls[1][2].global.fetch as typeof fetch;
  await injected(`${SUPA}/rest/v1/t`);
  await injected(`${SUPA}/storage/v1/object/b/k`);
  eq(sent.map((c) => c.input), [`${DATA}/rest/v1/t`, `${SUPA}/storage/v1/object/b/k`]);
});

Deno.test('createDataClient throws when CUTOVER_DONE=true and DATA_API_URL is unset (no silent fallback)', () => {
  const { calls, fn } = fakeCreateClient();
  throws(() => createDataClient(fn, SUPA, 'svc', undefined, env({ CUTOVER_DONE: 'true' })), DataApiNotConfiguredError);
  eq(calls.length, 0, 'no client created');
});
