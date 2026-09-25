import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBeacon } from './rum';

// VTID-04537: the gateway's RUM schema (vitana-platform
// services/gateway/src/routes/rum-beacon.ts) requires `ts_origin_ms` to be an
// integer. performance.timeOrigin is fractional, and sending it unrounded got
// every beacon rejected with 400 invalid_beacon.
describe('buildBeacon', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends ts_origin_ms as an integer', () => {
    vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(1727276400123.456);
    const beacon = buildBeacon('LCP', 1234.5);
    expect(Number.isInteger(beacon.ts_origin_ms)).toBe(true);
    expect(beacon.ts_origin_ms).toBe(1727276400123);
  });

  it('matches the rest of the gateway schema', () => {
    const beacon = buildBeacon('CLS', 0.12);
    expect(beacon.metric).toBe('CLS');
    expect(beacon.value).toBe(0.12);
    expect(beacon.screen.length).toBeGreaterThan(0);
    expect(beacon.session.length).toBeGreaterThan(0);
    expect(beacon.captured_at.length).toBeGreaterThanOrEqual(20);
  });
});
