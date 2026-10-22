/**
 * VTID-05184 — golden serializer: fixture HealthKit objects for golden cases
 * 2–5 produce the golden request bodies (field by field, in order; start/end
 * compared as instants, everything else exactly), every body validates
 * against the vendored schema, and the golden responses drive the handler.
 */
import { entryFor } from '../../src/health-sync/contract/v1/catalogue';
import { FakeHealthKit, ALL_TYPES_FOR, goldenCase, harness, instantsNormalised, markBackfilled, res, validateBatch, decodeBody } from './helpers';

const STEPS = 'HKQuantityTypeIdentifierStepCount';
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
const BATCH_1 = '6f1c2b1e-4d6a-4a8e-9c1b-2f3e4d5a6b7c';
const BATCH_2 = '7a2d3c4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const d = (iso: string) => new Date(iso);
const BERLIN = { HKTimeZone: 'Europe/Berlin' };

function keyOrder(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(keyOrder);
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => [k, keyOrder(x)]);
  return v;
}

function expectGolden(actual: unknown, expected: unknown) {
  expect(instantsNormalised(actual)).toEqual(instantsNormalised(expected));
  expect(keyOrder(instantsNormalised(actual))).toEqual(keyOrder(instantsNormalised(expected)));
  expect(validateBatch(actual)).toBe(true);
}

async function sendAll(h: ReturnType<typeof harness>, scope: ReturnType<ReturnType<typeof harness>['engine']['scopeFor']>, max = 10) {
  for (let i = 0; i < max; i++) {
    const out = await h.engine.sendOne(scope);
    if (out !== 'sent') return out;
  }
  return 'sent';
}

describe('golden case 2 — activity consented: stored', () => {
  const c = goldenCase('activity consented: stored');
  it('produces the golden body and acks on the golden 200', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk, ids: [BATCH_1] });
    const scope = await markBackfilled(h, 'user-a', '0');
    hk.add(STEPS, { uuid: 's1', startDate: d('2026-10-13T08:00:00Z'), endDate: d('2026-10-13T08:02:00Z'), quantity: 300, metadata: BERLIN });
    hk.add(STEPS, { uuid: 's2', startDate: d('2026-10-13T08:02:00Z'), endDate: d('2026-10-13T08:05:00Z'), quantity: 112, metadata: BERLIN });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    h.http.queue.push(res(200, c.steps[0].response.body));
    await sendAll(h, scope);
    const [body] = h.http.batches();
    expectGolden(body, c.steps[0].request.body);
    expect(JSON.stringify(body)).toBe(JSON.stringify(c.steps[0].request.body)); // byte-identical
    const sent = h.http.requests.find((r) => r.url.endsWith('/api/v1/health/ingest'))!;
    expect(sent.headers['Content-Type']).toBe('application/json');
    expect(sent.headers['Content-Encoding']).toBe('gzip');
    expect(sent.headers.Authorization).toBe('Bearer token');
    expect(await h.store.ledgerGet(scope, 'steps:2026-10-13T08:00:00.000Z')).toBeDefined();
    expect(await h.store.queueSize(scope)).toBe(0);
    expect((await h.store.anchor(scope, 'steps')).committed_anchor).toBe((await h.store.anchor(scope, 'steps')).read_anchor);
  });
});

describe('golden case 3 — same batch re-sent after a timeout: replay', () => {
  const c = goldenCase('same batch re-sent after a timeout: replay');
  it('a retry sends the same frozen bytes and batch_id; replay:true acks', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk, ids: [BATCH_1] });
    const scope = await markBackfilled(h, 'user-a', '0');
    hk.add(STEPS, { uuid: 's1', startDate: d('2026-10-13T08:00:00Z'), endDate: d('2026-10-13T08:05:00Z'), quantity: 412, metadata: BERLIN });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    h.http.queue.push({ error: 'timeout' }, res(200, c.steps[1].response.body));
    expect(await h.engine.sendOne(scope)).toBe('wait');
    h.clock.advance(60 * 60_000);
    expect(await h.engine.sendOne(scope)).toBe('sent');
    const [first, second] = h.http.requests.filter((r) => r.url.endsWith('/api/v1/health/ingest'));
    expect(Buffer.from(second.body as Uint8Array).equals(Buffer.from(first.body as Uint8Array))).toBe(true);
    expectGolden(decodeBody(first), c.steps[0].request.body);
    expectGolden(decodeBody(second), c.steps[1].request.body);
    expect(await h.store.inFlight(scope)).toBeUndefined();
    expect(await h.store.ledgerGet(scope, 'steps:2026-10-13T08:00:00.000Z')).toBeDefined();
  });
});

describe('golden case 4 — interval re-sent with a new value and an emptied interval deleted', () => {
  const c = goldenCase('interval re-sent with a new value and an emptied interval deleted');
  it('updated interval → item; emptied interval → deletion', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk, ids: [BATCH_1, BATCH_2] });
    const scope = await markBackfilled(h, 'user-a', '0');
    hk.add(STEPS, { uuid: 'a', startDate: d('2026-10-13T08:00:00Z'), endDate: d('2026-10-13T08:05:00Z'), quantity: 412, metadata: BERLIN });
    hk.add(STEPS, { uuid: 'b', startDate: d('2026-10-13T08:05:00Z'), endDate: d('2026-10-13T08:10:00Z'), quantity: 90, metadata: BERLIN });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    h.http.queue.push(res(200, c.steps[0].response.body));
    await sendAll(h, scope);
    // A HealthKit edit is delete + add; the 08:05 sample is deleted.
    hk.remove(STEPS, 'a');
    hk.add(STEPS, { uuid: 'a2', startDate: d('2026-10-13T08:00:00Z'), endDate: d('2026-10-13T08:05:00Z'), quantity: 415, metadata: BERLIN });
    hk.remove(STEPS, 'b');
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    h.http.queue.push(res(200, c.steps[1].response.body));
    await sendAll(h, scope);
    const [b1, b2] = h.http.batches();
    expectGolden(b1, c.steps[0].request.body);
    expectGolden(b2, c.steps[1].request.body);
    expect(await h.store.ledgerGet(scope, 'steps:2026-10-13T08:05:00.000Z')).toBeUndefined();
  });

  it('an unchanged interval produces nothing', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk, ids: [BATCH_1, BATCH_2] });
    const scope = await markBackfilled(h, 'user-a', '0');
    hk.add(STEPS, { uuid: 'a', startDate: d('2026-10-13T08:00:00Z'), endDate: d('2026-10-13T08:05:00Z'), quantity: 412 });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    await sendAll(h, scope);
    // A sample moved within the same interval: same total → nothing to send.
    hk.remove(STEPS, 'a');
    hk.add(STEPS, { uuid: 'a2', startDate: d('2026-10-13T08:01:00Z'), endDate: d('2026-10-13T08:04:00Z'), quantity: 412 });
    expect(await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true })).toBe(0);
    expect(await h.store.queueSize(scope)).toBe(0);
  });
});

describe('golden case 5 — sleep not consented: dropped per record, steps stored', () => {
  const c = goldenCase('sleep not consented: dropped per record, steps stored');
  it('HealthKit stage samples form the golden session; CATEGORY_NOT_CONSENTED resets sleep only', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk, ids: [BATCH_1] });
    const scope = await markBackfilled(h, 'user-a', '0');
    hk.add(STEPS, { uuid: 's1', startDate: d('2026-10-13T08:00:00Z'), endDate: d('2026-10-13T08:05:00Z'), quantity: 412, metadata: BERLIN });
    hk.add(SLEEP, { uuid: 'B3C1E6A0-5D2F-4A8B-9E1C-7F6D5A4B3C2D', startDate: d('2026-10-12T22:31:00+02:00'), endDate: d('2026-10-13T01:10:00+02:00'), value: 3, metadata: BERLIN });
    hk.add(SLEEP, { uuid: 'C0000000-0000-4000-8000-000000000002', startDate: d('2026-10-13T01:10:00+02:00'), endDate: d('2026-10-13T02:40:00+02:00'), value: 4, metadata: BERLIN });
    hk.add(SLEEP, { uuid: 'C0000000-0000-4000-8000-000000000003', startDate: d('2026-10-13T02:40:00+02:00'), endDate: d('2026-10-13T06:03:00+02:00'), value: 5, metadata: BERLIN });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    await h.engine.readCategory(scope, 'sleep', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    h.http.queue.push(res(200, c.steps[0].response.body));
    await sendAll(h, scope);
    const [body] = h.http.batches();
    expectGolden(body, c.steps[0].request.body);
    expect(JSON.stringify(body)).toBe(JSON.stringify(c.steps[0].request.body));
    expect(h.hooks.events.filter((e) => e.name === 'notConsented').map((e) => e.args[0])).toEqual(['sleep']);
    expect((await h.store.anchor(scope, 'sleep_session')).backfilled).toBe(false); // reset
    expect((await h.store.anchor(scope, 'steps')).backfilled).toBe(true); // untouched
    expect(await h.store.ledgerGet(scope, 'steps:2026-10-13T08:00:00.000Z')).toBeDefined();
    expect(h.hooks.counts.CATEGORY_NOT_CONSENTED).toBe(1);
    expect(entryFor('sleep_session')?.unit).toBe('min');
  });
});

describe('golden case 6 — nothing consented: 403', () => {
  const c = goldenCase('nothing consented: 403');
  it('drops the batch and resets each listed category for this source', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk, ids: [BATCH_1] });
    const scope = await markBackfilled(h, 'user-a', '0');
    hk.add(STEPS, { uuid: 's1', startDate: d('2026-10-13T08:00:00Z'), endDate: d('2026-10-13T08:05:00Z'), quantity: 412, metadata: BERLIN });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    h.http.queue.push(res(403, c.steps[0].response.body));
    expect(await h.engine.sendOne(scope)).toBe('sent');
    expect(await h.store.inFlight(scope)).toBeUndefined();
    expect(await h.store.queueSize(scope)).toBe(0);
    expect(h.hooks.events.filter((e) => e.name === 'notConsented').map((e) => e.args[0]).sort()).toEqual(['activity', 'sleep']);
    expect((await h.store.anchor(scope, 'steps')).backfilled).toBe(false);
  });
});

describe('golden error responses drive the handler', () => {
  const run = async (status: number, body: unknown) => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk, ids: [BATCH_1, BATCH_2] });
    const scope = await markBackfilled(h, 'user-a', '0');
    hk.add(STEPS, { uuid: 's1', startDate: d('2026-10-13T08:00:00Z'), endDate: d('2026-10-13T08:05:00Z'), quantity: 412 });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('ios'), history: true });
    h.http.queue.push(res(status, body));
    const out = await h.engine.sendOne(scope);
    return { h, scope, out };
  };
  it('400 unknown field → INVALID_BATCH: items dropped, cycle done, details kept (paths only)', async () => {
    const c = goldenCase('unknown field: 400');
    const { h, scope } = await run(400, c.steps[0].response.body);
    expect(await h.store.inFlight(scope)).toBeUndefined();
    expect(await h.store.queueSize(scope)).toBe(0);
    const a = await h.store.anchor(scope, 'steps');
    expect(a.committed_anchor).toBe(a.read_anchor);
    expect(h.hooks.events.find((e) => e.name === 'flag')?.args).toEqual(['client_error', [':unknown_field']]);
  });
  it('400 newer major → upgrade_required, queue kept', async () => {
    const c = goldenCase('newer major: 400');
    const { h, scope, out } = await run(400, c.steps[0].response.body);
    expect(out).toBe('stop');
    expect(h.hooks.events.find((e) => e.name === 'paused')?.args).toEqual(['upgrade_required']);
    expect((await h.store.inFlight(scope))?.items).toHaveLength(1);
  });
  it('401 middleware body → refresh once, retry the same frozen batch', async () => {
    const c = goldenCase('no token: 401');
    const { h, scope, out } = await run(401, c.steps[0].response.body);
    expect(out).toBe('sent');
    const b = await h.store.inFlight(scope);
    expect(b?.auth_retried).toBe(true);
    h.http.queue.push(res(401, c.steps[0].response.body));
    expect(await h.engine.sendOne(scope)).toBe('stop');
    expect(h.hooks.events.filter((e) => e.name === 'paused').map((e) => e.args[0])).toEqual(['auth_paused']);
    const ids = h.http.batches().map((x) => x.batch_id);
    expect(new Set(ids).size).toBe(1);
  });
  it('409 staging → server_disabled, nothing more sent', async () => {
    const c = goldenCase('staging: 409');
    const { h, scope, out } = await run(409, c.steps[0].response.body);
    expect(out).toBe('stop');
    expect(h.hooks.events.find((e) => e.name === 'paused')?.args).toEqual(['server_disabled']);
    expect(await h.store.inFlight(scope)).toBeDefined();
  });
});
