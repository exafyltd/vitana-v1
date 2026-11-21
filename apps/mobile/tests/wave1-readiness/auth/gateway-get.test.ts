/**
 * VTID-05681 (native-wave1-readiness-tests/auth, A4) — readiness evidence only; mocks only, no network.
 * Does NOT prove the Wave 1 exit (needs G1, NATIVE-APP-PLAN.md §5).
 *
 * gatewayGet (src/auth/gateway.ts:23) through __setGatewayForTests (:19). The injected gateway is a jest.fn;
 * the default (null) path is only checked for building a gateway lazily over the blocked fetch, never a real host.
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import { __setGatewayForTests, gatewayGet, getGateway } from '../../../src/auth/gateway';

jest.mock('../../../src/ports/env', () => {
  const actual = jest.requireActual('../../../src/ports/env');
  return { ...actual, config: { gatewayUrl: 'https://g1-gateway.example.org', supabaseUrl: 'https://g1-db.example.org', supabasePublishableKey: 'sb_publishable_g1test' } };
});

const reply = (status: number, body: string) => ({ ok: status >= 200 && status < 300, status, text: async () => body }) as unknown as Response;

afterEach(() => __setGatewayForTests(null));

describe('gatewayGet (gateway.ts:23)', () => {
  it('forwards the path to the injected gateway and returns the parsed JSON', async () => {
    const gw = jest.fn(async () => reply(200, JSON.stringify({ items: [1, 2] })));
    __setGatewayForTests(gw);
    await expect(gatewayGet<{ items: number[] }>('/api/v1/example')).resolves.toEqual({ items: [1, 2] });
    expect(gw).toHaveBeenCalledTimes(1);
    expect(gw).toHaveBeenCalledWith('/api/v1/example', undefined);
  });

  it('an empty body is null', async () => {
    __setGatewayForTests(async () => reply(200, ''));
    await expect(gatewayGet('/x')).resolves.toBeNull();
  });

  it('a non-JSON body is returned as the text', async () => {
    __setGatewayForTests(async () => reply(200, 'plain text'));
    await expect(gatewayGet('/x')).resolves.toBe('plain text');
  });

  it('a non-2xx answer propagates as a GatewayError with status and body', async () => {
    __setGatewayForTests(async () => reply(403, JSON.stringify({ error: 'nope' })));
    await expect(gatewayGet('/x')).rejects.toMatchObject({ status: 403, body: { error: 'nope' } });
  });

  it('a network failure of the gateway propagates unchanged', async () => {
    const boom = new Error('offline');
    __setGatewayForTests(async () => {
      throw boom;
    });
    await expect(gatewayGet('/x')).rejects.toBe(boom);
  });

  it('the injected gateway is the one getGateway returns until it is reset', () => {
    const gw = jest.fn();
    __setGatewayForTests(gw as never);
    expect(getGateway()).toBe(gw);
  });

  it('resetting with null builds the default gateway again (a new function, not the injected one)', () => {
    const gw = jest.fn();
    __setGatewayForTests(gw as never);
    __setGatewayForTests(null);
    const built = getGateway();
    expect(built).not.toBe(gw);
    expect(typeof built).toBe('function');
    expect(getGateway()).toBe(built);
  });

  it('the default gateway targets the configured origin and, with no network, fails instead of reaching a host', async () => {
    __setGatewayForTests(null);
    await expect(gatewayGet('/api/v1/example')).rejects.toThrow(/network is disabled in tests/);
  });
});
