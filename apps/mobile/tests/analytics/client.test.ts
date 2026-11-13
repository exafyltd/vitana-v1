/** VTID-05648 (native-wave2-fix-forward-r2/analytics) — the native product analytics client: web event shape, consent, tenant hold, batching. Fake fetch, fake timers, AsyncStorage mock; no network. */
import '../helpers/mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

let mockOrigin = 'https://gw.example';
jest.mock('../../src/ports/env', () => ({
  config: {},
  endpoints: () => {
    if (!mockOrigin) throw new Error('config missing');
    return { gatewayOrigin: mockOrigin };
  },
}));

let mockSeq = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `id-${(mockSeq += 1)}` }));

import {
  __analyticsState,
  __resetAnalyticsForTests,
  flushAnalytics,
  getAnalyticsConsent,
  noteRouteChange,
  setAnalyticsContext,
  track,
} from '../../src/analytics/client';
import { FORBIDDEN_PROPERTY_KEYS } from '../../src/analytics/types';

const OUTBOX_KEY = 'vitana_analytics_outbox';
const calls: { url: string; init: RequestInit }[] = [];
let respond: () => { ok: boolean };
let appStateHandler: ((s: string) => void) | null = null;

const bodyOf = (i: number) => JSON.parse(String(calls[i].init.body)) as { events: Record<string, unknown>[] };
const settle = () => jest.advanceTimersByTimeAsync(0);

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  await __resetAnalyticsForTests();
  calls.length = 0;
  mockOrigin = 'https://gw.example';
  respond = () => ({ ok: true });
  appStateHandler = null;
  (globalThis as { fetch: unknown }).fetch = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, h: (s: string) => void) => {
    appStateHandler = h;
    return { remove: jest.fn() };
  }) as never);
  (Platform as { OS: string }).OS = 'ios';
  setAnalyticsContext({ tenantId: 't-1', userIdHash: 'abc', language: 'de', consent: 'granted' });
});
afterEach(async () => {
  await __resetAnalyticsForTests();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('event shape', () => {
  it('carries the web field list, source ios, and no Authorization header', async () => {
    noteRouteChange('/home');
    track('screen_viewed', { feature_key: 'f', screen_id: 's', conversation_id: 'c', properties: { a: 1 } });
    for (let i = 0; i < 9; i += 1) track('x');
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://gw.example/api/v1/analytics/events/batch');
    expect(calls[0].init.method).toBe('POST');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('authorization');
    expect(calls[0].init.credentials).toBe('omit');
    const ev = bodyOf(0).events[0];
    expect(Object.keys(ev).sort()).toEqual(
      ['app_version', 'consent_state', 'conversation_id', 'device_type', 'event_id', 'event_name', 'event_type', 'feature_key', 'journey_id', 'language', 'occurred_at', 'properties', 'screen_id', 'screen_route', 'session_id', 'source', 'tenant_id', 'user_id_hash'].sort(),
    );
    expect(ev).toMatchObject({
      event_name: 'screen_viewed', event_type: 'journey', tenant_id: 't-1', user_id_hash: 'abc', conversation_id: 'c', screen_id: 's',
      feature_key: 'f', source: 'ios', language: 'de', consent_state: 'granted', screen_route: '/home', properties: { a: 1 },
    });
    expect(typeof ev.event_id).toBe('string');
    expect(typeof ev.session_id).toBe('string');
    expect(typeof ev.journey_id).toBe('string');
    expect(new Date(String(ev.occurred_at)).toISOString()).toBe(ev.occurred_at);
    expect(['mobile', 'tablet', 'desktop', 'unknown']).toContain(ev.device_type);
    expect(bodyOf(0).events.every((e) => e.session_id === ev.session_id && e.journey_id === ev.journey_id)).toBe(true);
  });

  it('source is android on Android', async () => {
    (Platform as { OS: string }).OS = 'android';
    for (let i = 0; i < 10; i += 1) track('x');
    await settle();
    expect(bodyOf(0).events[0].source).toBe('android');
  });

  it('strips forbidden property keys', async () => {
    const properties: Record<string, unknown> = { keep: 'yes' };
    for (const k of FORBIDDEN_PROPERTY_KEYS) properties[k] = 'secret';
    for (let i = 0; i < 10; i += 1) track('x', { properties });
    await settle();
    expect(bodyOf(0).events[0].properties).toEqual({ keep: 'yes' });
  });
});

describe('tenant hold and consent', () => {
  it('holds events until a tenant is known, then sends them with it', async () => {
    await __resetAnalyticsForTests();
    setAnalyticsContext({ userIdHash: null, language: 'de', consent: 'anonymous' });
    for (let i = 0; i < 10; i += 1) track('x');
    await settle();
    expect(calls).toHaveLength(0);
    setAnalyticsContext({ tenantId: 't-9' });
    for (let i = 0; i < 1; i += 1) track('y');
    await settle();
    expect(calls).toHaveLength(1);
    expect(bodyOf(0).events).toHaveLength(11);
    expect(bodyOf(0).events.every((e) => e.tenant_id === 't-9' && e.consent_state === 'anonymous')).toBe(true);
  });

  it('denied drops new events, clears buffer, pending and the stored outbox', async () => {
    track('a');
    await settle();
    expect(JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) ?? '[]')).toHaveLength(1);
    setAnalyticsContext({ consent: 'denied' });
    await settle();
    expect(getAnalyticsConsent()).toBe('denied');
    expect(await AsyncStorage.getItem(OUTBOX_KEY)).toBeNull();
    for (let i = 0; i < 12; i += 1) track('b');
    await jest.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(0);
    expect(__analyticsState().buffer).toHaveLength(0);
  });
});

describe('batching', () => {
  it('flushes at 10 events, not before', async () => {
    for (let i = 0; i < 9; i += 1) track('x');
    await settle();
    expect(calls).toHaveLength(0);
    track('x');
    await settle();
    expect(calls).toHaveLength(1);
    expect(bodyOf(0).events).toHaveLength(10);
  });

  it('flushes every 10 s', async () => {
    track('x');
    await jest.advanceTimersByTimeAsync(9_000);
    expect(calls).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1_500);
    expect(calls).toHaveLength(1);
    expect(bodyOf(0).events).toHaveLength(1);
  });

  it('flushes when the app goes to the background, not when it becomes active', async () => {
    track('x');
    await settle();
    expect(appStateHandler).not.toBeNull();
    appStateHandler?.('active');
    await settle();
    expect(calls).toHaveLength(0);
    appStateHandler?.('background');
    await settle();
    expect(calls).toHaveLength(1);
  });

  it('never sends more than 100 per POST and caps the outbox at 300', async () => {
    respond = () => ({ ok: false });
    for (let i = 0; i < 350; i += 1) track('x', { properties: { n: i } });
    await settle();
    expect(__analyticsState().buffer).toHaveLength(300);
    expect(__analyticsState().buffer[0].properties.n).toBe(50);
    respond = () => ({ ok: true });
    calls.length = 0;
    await flushAnalytics();
    expect(calls.length).toBe(3);
    for (let i = 0; i < calls.length; i += 1) expect(bodyOf(i).events.length).toBeLessThanOrEqual(100);
    expect(__analyticsState().buffer).toHaveLength(0);
  });

  it('keeps the batch when the POST fails (non-2xx or a throw) and resends it later', async () => {
    respond = () => ({ ok: false });
    for (let i = 0; i < 10; i += 1) track('x');
    await settle();
    expect(__analyticsState().buffer).toHaveLength(10);
    expect(JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) as string)).toHaveLength(10);
    respond = () => {
      throw new Error('offline');
    };
    await jest.advanceTimersByTimeAsync(10_000);
    expect(__analyticsState().buffer).toHaveLength(10);
    respond = () => ({ ok: true });
    await jest.advanceTimersByTimeAsync(10_000);
    expect(__analyticsState().buffer).toHaveLength(0);
    expect(await AsyncStorage.getItem(OUTBOX_KEY)).toBeNull();
  });

  it('does not post one batch twice while a flush is in flight', async () => {
    let release: (v: { ok: boolean }) => void = () => undefined;
    (globalThis as { fetch: unknown }).fetch = jest.fn((url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (calls.length > 1) return Promise.resolve({ ok: true });
      return new Promise((r) => {
        release = r as never;
      });
    });
    for (let i = 0; i < 10; i += 1) track('x');
    await settle();
    expect(calls).toHaveLength(1);
    for (let i = 0; i < 12; i += 1) track('y'); // more than FLUSH_AT while the first POST is still open
    await settle();
    expect(calls).toHaveLength(1);
    release({ ok: true });
    await settle();
    expect(bodyOf(0).events).toHaveLength(10);
    expect(calls).toHaveLength(2); // the backlog goes out after the first POST settles, once
    expect(bodyOf(1).events).toHaveLength(12);
    expect(__analyticsState().buffer).toHaveLength(0);
  });

  it('restores a stored outbox on first use', async () => {
    await __resetAnalyticsForTests();
    const stored = Array.from({ length: 4 }, (_, i) => ({ event_id: `old-${i}`, event_name: 'old', tenant_id: 't-1' }));
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(stored));
    setAnalyticsContext({ tenantId: 't-1', consent: 'granted' });
    track('new');
    await settle();
    await flushAnalytics();
    expect(calls).toHaveLength(1);
    expect(bodyOf(0).events.map((e) => e.event_id).slice(0, 4)).toEqual(['old-0', 'old-1', 'old-2', 'old-3']);
    expect(bodyOf(0).events).toHaveLength(5);
  });

  it('posts nothing without a gateway origin and never throws', async () => {
    mockOrigin = '';
    expect(() => {
      for (let i = 0; i < 12; i += 1) track('x');
    }).not.toThrow();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(0);
  });
});
