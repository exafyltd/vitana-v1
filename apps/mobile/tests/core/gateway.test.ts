/** VTID-05183 — the injected-config gateway fetch: no default origin, bearer header, typed errors. */
import { gatewayApiUrl } from '@vitana/core/config';
import { createGatewayFetch, gatewayJson, GatewayError } from '@vitana/core/gateway';

const ORIGIN = 'https://g1-gateway.example.org';

describe('gatewayApiUrl', () => {
  // The non-empty cases mirror src/lib/gateway-base.test.ts (resolveGatewayBase).
  it.each([
    ['https://g1-gateway.example.org', `${ORIGIN}/api/v1`],
    ['https://g1-gateway.example.org/', `${ORIGIN}/api/v1`],
    ['https://g1-gateway.example.org///', `${ORIGIN}/api/v1`],
    ['https://g1-gateway.example.org/api/v1', `${ORIGIN}/api/v1`],
    ['https://g1-gateway.example.org/api/v1/', `${ORIGIN}/api/v1`],
    ['  https://g1-gateway.example.org  ', `${ORIGIN}/api/v1`],
  ])('%s → %s', (input, expected) => {
    expect(gatewayApiUrl(input)).toBe(expected);
  });

  it.each(['', '   '])('%j throws: there is no default gateway', (input) => {
    expect(() => gatewayApiUrl(input)).toThrow(/no default gateway/);
  });
});

function recorder(status = 200, body: unknown = { ok: true }) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: { ...(init?.headers as Record<string, string>) } });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  });
  return { calls, fetchImpl };
}

describe('createGatewayFetch', () => {
  it('requires fetchImpl and an origin', () => {
    // @ts-expect-error — fetchImpl is required
    expect(() => createGatewayFetch({ origin: ORIGIN, getAccessToken: () => null })).toThrow(/fetchImpl/);
    expect(() => createGatewayFetch({ origin: '', getAccessToken: () => null, fetchImpl: jest.fn() })).toThrow(/no default gateway/);
  });

  it('sends the bearer token when there is one', async () => {
    const { calls, fetchImpl } = recorder();
    const gw = createGatewayFetch({ origin: ORIGIN, getAccessToken: async () => 'tok-1', fetchImpl });
    await gw('/me', { headers: { 'x-trace': 'a' } });
    expect(calls[0].url).toBe(`${ORIGIN}/api/v1/me`);
    expect(calls[0].headers.authorization).toBe('Bearer tok-1');
    expect(calls[0].headers['x-trace']).toBe('a');
  });

  it('sends no authorization header when signed out', async () => {
    const { calls, fetchImpl } = recorder();
    const gw = createGatewayFetch({ origin: `${ORIGIN}/api/v1/`, getAccessToken: () => null, fetchImpl });
    await gw('alive');
    expect(calls[0].url).toBe(`${ORIGIN}/api/v1/alive`);
    expect(calls[0].headers.authorization).toBeUndefined();
  });
});

describe('gatewayJson', () => {
  it('parses JSON on success', async () => {
    const { fetchImpl } = recorder(200, { value: 3 });
    const gw = createGatewayFetch({ origin: ORIGIN, getAccessToken: () => null, fetchImpl });
    await expect(gatewayJson<{ value: number }>(gw, '/x')).resolves.toEqual({ value: 3 });
  });

  it('throws GatewayError carrying { key, params } (backend-supplied UI text)', async () => {
    const { fetchImpl } = recorder(422, { key: 'errors.wallet.limit', params: { max: 5 } });
    const gw = createGatewayFetch({ origin: ORIGIN, getAccessToken: () => null, fetchImpl });
    const err = await gatewayJson(gw, '/wallet').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err).toMatchObject({ status: 422, key: 'errors.wallet.limit', params: { max: 5 } });
  });

  it('a non-JSON error body still throws GatewayError without a key', async () => {
    const { fetchImpl } = recorder(500, 'upstream down');
    const gw = createGatewayFetch({ origin: ORIGIN, getAccessToken: () => null, fetchImpl });
    const err = (await gatewayJson(gw, '/x').catch((e: unknown) => e)) as GatewayError;
    expect(err).toBeInstanceOf(GatewayError);
    expect(err.status).toBe(500);
    expect(err.key).toBeUndefined();
  });
});
