/**
 * VTID-05184 — the module as a whole: dark by default, consent before OS
 * permission, withdrawal, sign-out and member switch, source state, safety
 * (N5a plan changes 5, 6, 10–12; Tests "Consent before OS permission",
 * "Source state", "Dark", "Safety").
 */
const mockRequired = { healthkit: 0, healthConnect: 0, secureStore: 0, sqlite: 0, backgroundTask: 0 };
jest.mock('@kingstinct/react-native-healthkit', () => {
  mockRequired.healthkit += 1;
  return {};
});
jest.mock('react-native-health-connect', () => {
  mockRequired.healthConnect += 1;
  return {};
});
jest.mock('expo-secure-store', () => {
  mockRequired.secureStore += 1;
  return {};
});
jest.mock('expo-sqlite', () => {
  mockRequired.sqlite += 1;
  return {};
});
jest.mock('expo-background-task', () => {
  mockRequired.backgroundTask += 1;
  return {};
});

import { createHealthSync, type HealthSyncPorts } from '../../src/health-sync';
import { createGatewayClient } from '../../src/health-sync/gateway';
import { createRedactingLogger } from '../../src/health-sync/logger';
import { createHealthKitReader } from '../../src/health-sync/readers/healthkit';
import { createHealthConnectReader } from '../../src/health-sync/readers/health-connect';
import { HealthStore } from '../../src/health-sync/store/store';
import { createMemoryDriver } from '../../src/health-sync/store/memory-driver';
import type { AuthPort, DevicePort, HttpRequest, SchedulerPort } from '../../src/health-sync/ports';
import type { TableDriver } from '../../src/health-sync/store/types';
import { CATEGORIES, type Category } from '../../src/health-sync/contract/v1/catalogue';
import { FakeClock, FakeHealthConnect, FakeHealthKit, FakeHttp, G1, GOLDEN_CLOCK, GOLDEN_INSTALL, goldenCase, res, uuidSeq } from './helpers';

const STEPS = 'HKQuantityTypeIdentifierStepCount';

class FakeAuth implements AuthPort {
  session: { user_id: string; tenant_id: string } | null = { user_id: 'user-a', tenant_id: 't' };
  listeners = new Set<(s: { user_id: string } | null) => void>();
  getSession = async () => this.session;
  getAccessToken = async () => (this.session ? `token-${this.session.user_id}` : null);
  refresh = async () => true;
  onChange = (cb: (s: { user_id: string } | null) => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  switchTo(user: string | null) {
    this.session = user ? { user_id: user, tenant_id: 't' } : null;
    this.listeners.forEach((l) => l(this.session));
  }
}

const device = (os: 'ios' | 'android'): DevicePort => ({ os, osVersion: os === 'ios' ? '18.1' : '35', appVersion: '1.0.0', manufacturer: os === 'ios' ? 'Apple' : 'Google', model: null, timeZone: () => 'Europe/Berlin' });

/** consents per member token: { 'user-a': { apple_health: ['activity'] } } */
function gatewayFor(http: FakeHttp, grants: Record<string, Partial<Record<string, Category[]>>>) {
  http.responders.push((req: HttpRequest) => {
    const user = (req.headers.Authorization ?? '').replace('Bearer token-', '');
    if (req.url.endsWith('/api/v1/health/consents') && req.method === 'GET') {
      const consents = Object.entries(grants[user] ?? {}).flatMap(([resource, cats]) => (cats ?? []).map((c) => ({ category: `sync_${c}`, resource_id: resource, active: true })));
      return res(200, { ok: true, store_pending: false, categories: CATEGORIES.map((c) => ({ key: `sync_${c}`, current_text_version: 'v1', processing_active: true })), consents, partners: [], connectors: [] });
    }
    if (req.url.endsWith('/api/v1/health/ingest/contract')) return res(200, goldenCase('contract self-check').steps[0].response.body);
    return undefined;
  });
}

function build(opts: { os: 'ios' | 'android'; flag: boolean; auth?: FakeAuth; hk?: FakeHealthKit; hc?: FakeHealthConnect; http?: FakeHttp; store?: HealthStore }) {
  const http = opts.http ?? new FakeHttp();
  const auth = opts.auth ?? new FakeAuth();
  const store = opts.store ?? new HealthStore(createMemoryDriver());
  const driver = jest.fn(async (): Promise<TableDriver> => store.driver);
  const readerFactory = jest.fn((d: DevicePort) => (d.os === 'ios' ? createHealthKitReader(opts.hk ?? new FakeHealthKit()) : createHealthConnectReader(opts.hc ?? new FakeHealthConnect(), () => 'Europe/Berlin')));
  const scheduler: SchedulerPort & { register: jest.Mock; clear: jest.Mock } = { register: jest.fn(async () => undefined), clear: jest.fn(async () => undefined) };
  const schedulerFactory = jest.fn(() => scheduler);
  const clock = new FakeClock(GOLDEN_CLOCK);
  const ports: HealthSyncPorts = {
    auth,
    appConfig: { getFlag: () => opts.flag, onChange: () => () => undefined },
    http,
    clock,
    config: { gatewayUrl: G1 },
    device: () => device(opts.os),
    installId: { get: async () => GOLDEN_INSTALL },
    driver,
    reader: readerFactory,
    scheduler: schedulerFactory,
    uuid: uuidSeq(['6f1c2b1e-4d6a-4a8e-9c1b-2f3e4d5a6b7c', '7a2d3c4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e']),
    logger: { log: () => undefined },
  };
  return { sync: createHealthSync(ports), http, auth, store, driver, readerFactory, scheduler, schedulerFactory, clock };
}

const requiredNothing = () => expect(mockRequired).toEqual({ healthkit: 0, healthConnect: 0, secureStore: 0, sqlite: 0, backgroundTask: 0 });

describe('dark by default', () => {
  it('with the N4 stub (flag off): no reader, store, background task, observer or network call', async () => {
    const b = build({ os: 'ios', flag: false });
    const stop = b.sync.start();
    await b.sync.syncNow();
    await b.sync.getState();
    expect(await b.sync.grantConsent('activity', { text_version: 'v1', shown_locale: 'de' })).toEqual({ status: 'disabled' });
    expect(await b.sync.requestOsPermission(['activity'])).toEqual({ status: 'disabled' });
    expect((await b.sync.connect()).ran).toBe(false);
    stop();
    expect(b.http.requests).toHaveLength(0);
    expect(b.driver).not.toHaveBeenCalled();
    expect(b.readerFactory).not.toHaveBeenCalled();
    expect(b.schedulerFactory).not.toHaveBeenCalled();
    requiredNothing();
  });
  it('with the N3 stub (signed out) and the flag on: nothing runs either', async () => {
    const auth = new FakeAuth();
    auth.session = null;
    const b = build({ os: 'android', flag: true, auth });
    expect(await b.sync.syncNow()).toEqual({ ran: false, reason: 'signed_out' });
    expect(await b.sync.requestOsPermission(['activity'])).toEqual({ status: 'disabled' });
    expect(b.http.requests).toHaveLength(0);
    expect(b.driver).not.toHaveBeenCalled();
    expect(b.readerFactory).not.toHaveBeenCalled();
    requiredNothing();
  });
  it('createHealthSync() with every default port stays dark and requires no native health library', async () => {
    const sync = createHealthSync({ device: () => device('ios') });
    expect(await sync.syncNow()).toEqual({ ran: false, reason: 'flag_off' });
    expect(sync.snapshot().flag).toBe(false);
    requiredNothing();
  });
  it('withdrawal always reaches the gateway, also with the flag off', async () => {
    const b = build({ os: 'ios', flag: false });
    expect(await b.sync.revokeConsent('sleep', 'de')).toEqual({ status: 'revoked' });
    const [req] = b.http.requests;
    expect(req.method).toBe('POST');
    expect(req.url).toBe(`${G1}/api/v1/health/consents/revoke`);
    expect(JSON.parse(String(req.body))).toEqual({ category: 'sync_sleep', resource_id: 'apple_health', locale: 'de' });
    expect(b.sync.snapshot().consent.sleep).toBe('not_granted');
    requiredNothing();
  });
});

describe('consent before OS permission', () => {
  it('iOS: only categories with a fresh active grant for this member and this source; read types only', async () => {
    const hk = new FakeHealthKit();
    const b = build({ os: 'ios', flag: true, hk });
    gatewayFor(b.http, { 'user-a': { apple_health: ['activity'], health_connect: ['sleep'] } });
    const r = await b.sync.requestOsPermission(['activity', 'sleep']);
    expect(r).toEqual({ requested: ['activity'], consent_required: ['sleep'], status: 'requested' });
    const auths = hk.calls.filter((c) => c.fn === 'requestAuthorization');
    expect(auths).toHaveLength(1);
    expect(auths[0].args[0]).toEqual({ toRead: ['HKQuantityTypeIdentifierStepCount', 'HKQuantityTypeIdentifierActiveEnergyBurned', 'HKQuantityTypeIdentifierAppleExerciseTime', 'HKQuantityTypeIdentifierDistanceWalkingRunning', 'HKWorkoutType'], toShare: [] });
    // never a cache: a second request reads the consents again
    await b.sync.requestOsPermission(['activity']);
    expect(b.http.requests.filter((q) => q.url.endsWith('/api/v1/health/consents'))).toHaveLength(2);
  });
  it('no grant → consent_required and no OS call', async () => {
    const hk = new FakeHealthKit();
    const b = build({ os: 'ios', flag: true, hk });
    gatewayFor(b.http, {});
    expect(await b.sync.requestOsPermission(['activity', 'heart'])).toEqual({ requested: [], consent_required: ['activity', 'heart'], status: 'consent_required' });
    expect(hk.calls.filter((c) => c.fn === 'requestAuthorization')).toHaveLength(0);
  });
  it('a second member on the same device gets nothing until they grant their own consent', async () => {
    const hk = new FakeHealthKit();
    const b = build({ os: 'ios', flag: true, hk });
    gatewayFor(b.http, { 'user-a': { apple_health: ['activity'] } });
    await b.sync.requestOsPermission(['activity']);
    b.auth.session = { user_id: 'user-b', tenant_id: 't' };
    expect((await b.sync.requestOsPermission(['activity'])).status).toBe('consent_required');
    expect(hk.calls.filter((c) => c.fn === 'requestAuthorization')).toHaveLength(1);
    // and a pass as user-b reads nothing
    hk.add(STEPS, { uuid: 's', startDate: new Date(GOLDEN_CLOCK - 3_600_000), endDate: new Date(GOLDEN_CLOCK - 3_500_000), quantity: 10 });
    const pass = await b.sync.syncNow();
    expect(pass.read).toBe(0);
    expect(hk.calls.filter((c) => c.fn.endsWith('WithAnchor'))).toHaveLength(0);
  });
  it('Health Connect: READ permissions of granted categories + history + background, never WRITE', async () => {
    const hc = new FakeHealthConnect();
    const b = build({ os: 'android', flag: true, hc });
    gatewayFor(b.http, { 'user-a': { health_connect: ['heart'] } });
    await b.sync.requestOsPermission(['heart', 'body']);
    const [call] = hc.calls.filter((c) => c.fn === 'requestPermission');
    expect(call.args[0]).toEqual([
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'RestingHeartRate' },
      { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      { accessType: 'read', recordType: 'ReadHealthDataHistory' },
      { accessType: 'read', recordType: 'BackgroundAccessPermission' },
    ]);
  });
  it('grantConsent sends the displayed version and locale; a changed wording is refused before any POST', async () => {
    const b = build({ os: 'ios', flag: true });
    gatewayFor(b.http, {});
    expect(await b.sync.grantConsent('sleep', { text_version: 'v0', shown_locale: 'de' })).toEqual({ status: 'wording_changed' });
    expect(b.http.requests.some((r) => r.url.endsWith('/grant'))).toBe(false);
    expect(await b.sync.grantConsent('sleep', { text_version: 'v1', shown_locale: 'sr' })).toEqual({ status: 'granted' });
    const grant = b.http.requests.find((r) => r.url.endsWith('/grant'))!;
    expect(JSON.parse(String(grant.body))).toEqual({ category: 'sync_sleep', resource_id: 'apple_health', text_version: 'v1', locale: 'sr', granted_via: 'native_health_sync' });
    b.http.responders.unshift((r) => (r.url.endsWith('/grant') ? res(409, { ok: false, error: 'STALE_TEXT_VERSION' }) : undefined));
    expect(await b.sync.grantConsent('sleep', { text_version: 'v1', shown_locale: 'de' })).toEqual({ status: 'wording_changed' });
    b.http.responders.unshift((r) => (r.url.endsWith('/grant') ? res(503, { ok: false, error: 'CONSENT_STORE_PENDING' }) : undefined));
    expect(await b.sync.grantConsent('sleep', { text_version: 'v1', shown_locale: 'de' })).toEqual({ status: 'unavailable' });
  });
});

describe('a full pass, withdrawal, sign-out and member switch', () => {
  async function syncedWithQueue() {
    const hk = new FakeHealthKit();
    const b = build({ os: 'ios', flag: true, hk });
    gatewayFor(b.http, { 'user-a': { apple_health: ['activity', 'body'] }, 'user-b': { apple_health: ['activity'] } });
    b.http.responders.push((r) => (r.url.endsWith('/api/v1/health/ingest') ? { error: 'network' } : undefined)); // keep things queued
    hk.add(STEPS, { uuid: 's', startDate: new Date(GOLDEN_CLOCK - 3_600_000), endDate: new Date(GOLDEN_CLOCK - 3_500_000), quantity: 10 });
    hk.add('HKQuantityTypeIdentifierBodyMass', { uuid: 'w', startDate: new Date(GOLDEN_CLOCK - 3_600_000), endDate: new Date(GOLDEN_CLOCK - 3_600_000), quantity: 70, unit: 'kg' });
    const pass = await b.sync.syncNow();
    return { b, hk, pass };
  }
  const queuedFor = async (b: ReturnType<typeof build>, user: string) => {
    const scope = { user_id: user, install_id: GOLDEN_INSTALL, kind: 'apple_health' as const };
    return [...(await b.store.queued(scope)), ...((await b.store.inFlight(scope))?.items ?? [])];
  };

  it('reads consented categories, registers background delivery and keeps the batch on a network error', async () => {
    const { b, pass } = await syncedWithQueue();
    expect(pass).toMatchObject({ ran: true });
    expect(pass.read).toBeGreaterThan(0);
    expect((await queuedFor(b, 'user-a')).map((i) => i.category).sort()).toEqual(['activity', 'body']);
    expect(b.scheduler.register).toHaveBeenCalledWith(['activity', 'body']);
    expect(b.sync.snapshot().consent).toMatchObject({ activity: 'granted', body: 'granted', sleep: 'not_granted' });
  });
  it('revokeConsent: POST /revoke and, at once, that category is purged locally and its background types removed', async () => {
    const { b } = await syncedWithQueue();
    await b.sync.revokeConsent('body');
    expect((await queuedFor(b, 'user-a')).map((i) => i.category)).toEqual(['activity']);
    expect((await b.store.anchor({ user_id: 'user-a', install_id: GOLDEN_INSTALL, kind: 'apple_health' }, 'body_weight')).backfilled).toBe(false);
    expect(b.scheduler.register).toHaveBeenLastCalledWith(['activity']);
    await b.sync.revokeConsent('activity');
    expect(b.scheduler.clear).toHaveBeenCalled();
  });
  it('sign-out deletes the member’s rows and clears background types; the key and install id stay', async () => {
    const { b } = await syncedWithQueue();
    b.sync.start();
    b.auth.switchTo(null);
    await new Promise((r) => setTimeout(r, 0));
    expect(await queuedFor(b, 'user-a')).toEqual([]);
    expect(b.scheduler.clear).toHaveBeenCalled();
  });
  it('a different member signing in: the previous member’s rows are deleted', async () => {
    const { b } = await syncedWithQueue();
    b.auth.session = { user_id: 'user-b', tenant_id: 't' };
    await b.sync.syncNow();
    expect(await queuedFor(b, 'user-a')).toEqual([]);
    expect((await queuedFor(b, 'user-b')).map((i) => i.category)).toEqual(['activity']);
  });
  it('the flag switched off after being on: queued records go, committed anchors stay', async () => {
    const hk = new FakeHealthKit();
    let flag = true;
    const b = build({ os: 'ios', flag: true, hk });
    const sync = createHealthSync({ ...{ auth: b.auth, http: b.http, clock: b.clock, config: { gatewayUrl: G1 }, device: () => device('ios'), installId: { get: async () => GOLDEN_INSTALL }, driver: async () => b.store.driver, reader: () => createHealthKitReader(hk), scheduler: () => b.scheduler, uuid: uuidSeq([]), logger: { log: () => undefined } }, appConfig: { getFlag: () => flag, onChange: () => () => undefined } });
    gatewayFor(b.http, { 'user-a': { apple_health: ['activity'] } });
    b.http.responders.push((r) => (r.url.endsWith('/api/v1/health/ingest') ? { error: 'network' } : undefined));
    hk.add(STEPS, { uuid: 's', startDate: new Date(GOLDEN_CLOCK - 3_600_000), endDate: new Date(GOLDEN_CLOCK - 3_500_000), quantity: 10 });
    await sync.syncNow();
    expect((await queuedFor(b, 'user-a')).length).toBe(1);
    flag = false;
    expect(await sync.syncNow()).toEqual({ ran: false, reason: 'flag_off' });
    expect(await queuedFor(b, 'user-a')).toEqual([]);
    expect(b.scheduler.clear).toHaveBeenCalled();
  });
  it('the logger never receives a value, stats, record id or timestamp', () => {
    const seen: unknown[] = [];
    const log = createRedactingLogger((e, f) => seen.push([e, f]));
    log.log('batch', { code: 'OK', count: 3, value: 70, stats: { n: 1 }, record_id: 'x', start: 's', end: 'e', stages: [], nested: { value: 1, type: 'steps' }, records: [{ value: 1 }] });
    expect(seen).toEqual([['batch', { code: 'OK', count: 3, nested: { type: 'steps' } }]]);
  });
});

describe('source state (Android: OS permission revoked → source paused)', () => {
  async function passWith(granted: string[], hc = new FakeHealthConnect(), b?: ReturnType<typeof build>) {
    hc.granted = granted.map((recordType) => ({ accessType: 'read', recordType }));
    const built = b ?? build({ os: 'android', flag: true, hc });
    if (!b) gatewayFor(built.http, { 'user-a': { health_connect: ['activity', 'heart'] } });
    await built.sync.syncNow();
    return { b: built, hc, posts: built.http.requests.filter((r) => r.url.endsWith('/source-state')).map((r) => JSON.parse(String(r.body))) };
  }
  it('all lost → one os_permission_revoked; restored → active; partial → no POST', async () => {
    const hc = new FakeHealthConnect();
    const first = await passWith([], hc);
    expect(first.posts).toEqual([{ source_kind: 'health_connect', install_id: GOLDEN_INSTALL, state: 'os_permission_revoked', permitted_categories: [] }]);
    first.b.clock.advance(60_000);
    const again = await passWith([], hc, first.b);
    expect(again.posts).toHaveLength(1);
    const restored = await passWith(['Steps', 'HeartRate'], hc, first.b);
    expect(restored.posts[1]).toEqual({ source_kind: 'health_connect', install_id: GOLDEN_INSTALL, state: 'active', permitted_categories: ['activity', 'heart'] });
    const partial = await passWith(['Steps'], hc, first.b);
    expect(partial.posts).toHaveLength(2);
    expect(partial.b.sync.snapshot().os_permission).toMatchObject({ activity: 'granted', heart: 'denied' });
  });
  it('Health Connect uninstalled → not read, os_permission_revoked once', async () => {
    const hc = new FakeHealthConnect();
    hc.sdkStatus = 1;
    const { posts, b } = await passWith(['Steps'], hc);
    expect(b.sync.snapshot().platformAvailable).toBe(false);
    expect(posts.map((p) => p.state)).toEqual(['os_permission_revoked']);
  });
  it('iOS never posts os_permission_revoked', async () => {
    const b = build({ os: 'ios', flag: true });
    gatewayFor(b.http, { 'user-a': { apple_health: ['activity'] } });
    await b.sync.syncNow();
    expect(b.http.requests.some((r) => r.url.endsWith('/source-state'))).toBe(false);
    expect(b.sync.snapshot().os_permission_withdrawable_in_app).toBe(false);
  });
});

describe('no production host, ever', () => {
  it.each(['https://gateway.vitanaland.com', 'https://preview-aws-gateway.vitanaland.com'])('the ingest client refuses %s and makes no request', async (url) => {
    const http = new FakeHttp();
    const client = createGatewayClient({ gatewayUrl: url }, http, new FakeAuth());
    await expect(client.get('/api/v1/health/ingest/contract')).rejects.toThrow(/never reach production or staging/);
    await expect(client.postBatch('{}', false)).rejects.toThrow();
    expect(http.requests).toHaveLength(0);
  });
  it('an unset gateway URL is an error, never a default', async () => {
    const http = new FakeHttp();
    await expect(createGatewayClient({}, http, new FakeAuth()).get('/x')).rejects.toThrow(/not set/);
    expect(http.requests).toHaveLength(0);
  });
});

describe('the require counters are live (proves the dark checks above can fail)', () => {
  it('requiring a health library is counted', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@kingstinct/react-native-healthkit');
    expect(mockRequired.healthkit).toBe(1);
  });
});
