import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { sendAnonymousBeacon } from './anon-beacon';

describe('sendAnonymousBeacon (VTID-04516)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('queues a keepalive POST with credentials omitted', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(sendAnonymousBeacon('https://gw.example/api/v1/rum/beacon', '{"a":1}')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gw.example/api/v1/rum/beacon');
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}', keepalive: true, credentials: 'omit', mode: 'cors' });
  });

  it('never throws, even when fetch throws or rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('boom'); }));
    expect(sendAnonymousBeacon('u', 'b')).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(sendAnonymousBeacon('u', 'b')).toBe(true);
    await Promise.resolve();
  });

  it('no telemetry sender calls navigator.sendBeacon (credentialed CORS is rejected by the gateway)', () => {
    for (const f of ['src/lib/rum.ts', 'src/lib/notifDiag.ts', 'src/lib/product-analytics/client.ts']) {
      const code = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f).not.toMatch(/navigator\.sendBeacon\s*\(/);
    }
  });
});
