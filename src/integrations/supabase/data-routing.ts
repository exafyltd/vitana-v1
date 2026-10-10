/**
 * Aurora cutover, option B (VTID-05023): only database traffic moves.
 *
 * When VITE_DATA_API_URL is set, every PostgREST request the Supabase client
 * makes (`${SUPABASE_URL}/rest/v1/...`) goes to the PostgREST-Aurora proxy
 * instead. Auth, Storage, Functions and Realtime stay on Supabase unchanged, so
 * sessions, file URLs and edge functions are untouched. Unset (today) = no
 * rewrite at all: the wrapper is a pass-through.
 */

const trimSlash = (s: string) => s.replace(/\/+$/, '');

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
    credentials: src.credentials,
    cache: src.cache,
    redirect: src.redirect,
    referrerPolicy: src.referrerPolicy,
    integrity: src.integrity,
    keepalive: src.keepalive,
    signal: src.signal,
  });
}
