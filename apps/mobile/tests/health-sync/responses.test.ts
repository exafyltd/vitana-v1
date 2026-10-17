/**
 * VTID-05184 — every batch, middleware and record code has its effect on the
 * queue, the anchors and the state (N5a plan change 9, Tests "Response
 * handling"); retries reuse the frozen batch_id; per-record STORE_UNAVAILABLE
 * goes into a new batch; BATCH_ID_REUSED and the 24-hour unfreeze get a new
 * id; 413 splits. Plus the purge scope (F3) and the source block (F1).
 */
import { BATCH_ACTIONS, RECORD_ACTIONS, backoffMs, classify } from '../../src/health-sync/responses';
import { AUTH_MIDDLEWARE_CODES, BATCH_ERROR_CODES, type RecordV1 } from '../../src/health-sync/contract/v1/wire';
import { HealthStore } from '../../src/health-sync/store/store';
import { createMemoryDriver } from '../../src/health-sync/store/memory-driver';
import type { NewItem } from '../../src/health-sync/store/store';
import type { Scope } from '../../src/health-sync/store/types';
import { sourceFor } from '../../src/health-sync/serialize';
import { harness, noopAuth, res, decodeBody, type Harness } from './helpers';

const IDS = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'];

function rec(id: string, type = 'body_weight', category: NewItem['category'] = 'body'): NewItem {
  const payload: RecordV1 = { record_id: id, type, value: 70, unit: type === 'sleep_session' ? 'min' : 'kg', start: '2026-10-13T07:00:00+02:00', end: '2026-10-13T07:00:00+02:00', tz: 'Europe/Berlin' };
  return { record_id: id, type, category, kind: 'record', payload, hash: `h-${id}`, cycle: 0, mode: 'incremental', startMs: Date.parse(payload.start) };
}
function del(id: string, type = 'body_weight', category: NewItem['category'] = 'body'): NewItem {
  return { record_id: id, type, category, kind: 'deletion', payload: { record_id: id, type }, hash: `del:${id}`, cycle: 0, mode: 'incremental' };
}

async function seed(h: Harness, scope: Scope, items: NewItem[]) {
  const byType = new Map<string, NewItem[]>();
  items.forEach((i) => byType.set(i.type, [...(byType.get(i.type) ?? []), i]));
  for (const [type, list] of byType) {
    await h.store.setAnchor(scope, type, { read_anchor: 'r0', committed_anchor: 'r0', next_cycle: 1, backfilled: true, backfill_from_ms: 0 });
    const cycle = await h.store.openCycle(scope, type, `r1-${type}`);
    await h.store.enqueue(scope, list.map((i) => ({ ...i, cycle })));
  }
}

async function setup(items: NewItem[] = [rec('w1'), rec('w2')]) {
  const h = harness({ platform: 'ios', ids: IDS });
  const scope = h.engine.scopeFor('user-a');
  await seed(h, scope, items);
  return { h, scope };
}

const err = (code: string, extra: Record<string, unknown> = {}) => {
  const status = (BATCH_ERROR_CODES as Record<string, { status: number }>)[code]?.status ?? (AUTH_MIDDLEWARE_CODES as Record<string, { status: number }>)[code].status;
  return res(status, { ok: false, error: code, ...extra });
};
const paused = (h: Harness) => h.hooks.events.filter((e) => e.name === 'paused').map((e) => e.args[0]);
const ingestReqs = (h: Harness) => h.http.requests.filter((r) => r.url.endsWith('/api/v1/health/ingest'));

describe('the code → action table is total', () => {
  it('every batch and middleware code maps to an action, every record code too', () => {
    for (const c of [...Object.keys(BATCH_ERROR_CODES), ...Object.keys(AUTH_MIDDLEWARE_CODES)]) expect(BATCH_ACTIONS[c as keyof typeof BATCH_ACTIONS]).toBeDefined();
    expect(Object.keys(RECORD_ACTIONS)).toHaveLength(7);
  });
  it('unknown codes, non-JSON bodies and network errors are transport back-offs', () => {
    expect(classify({ error: 'network' })).toMatchObject({ type: 'transport', reason: 'network' });
    expect(classify(res(502, undefined))).toMatchObject({ type: 'transport', reason: 'non_json' });
    expect(classify(res(418, { ok: false, error: 'TEAPOT' }))).toMatchObject({ type: 'transport', reason: 'unexpected' });
  });
  it('back-off is exponential with jitter and capped', () => {
    expect(backoffMs(0, 1000, 10_000, () => 1)).toBe(1000);
    expect(backoffMs(3, 1000, 10_000, () => 1)).toBe(8000);
    expect(backoffMs(10, 1000, 10_000, () => 1)).toBe(10_000);
    expect(backoffMs(10, 1000, 10_000, () => 0)).toBe(5000);
  });
});

describe('batch codes', () => {
  it('INVALID_BATCH: items dropped, cycles done; three in a row → client_error', async () => {
    const { h, scope } = await setup([rec('a'), rec('b'), rec('c')]);
    h.engine.budget = { ...h.engine.budget, maxRecords: 1 };
    for (let i = 0; i < 3; i++) h.http.queue.push(err('INVALID_BATCH', { details: [{ path: 'records.0.value', code: 'invalid_type' }] }));
    expect(await h.engine.sendOne(scope)).toBe('sent');
    expect(await h.engine.sendOne(scope)).toBe('sent');
    expect(await h.engine.sendOne(scope)).toBe('stop');
    expect(paused(h)).toEqual(['client_error']);
    expect(await h.store.queueSize(scope)).toBe(0);
    const a = await h.store.anchor(scope, 'body_weight');
    expect(a.committed_anchor).toBe('r1-body_weight');
    expect(JSON.stringify(h.hooks.events)).not.toMatch(/"value"|70/);
  });
  it('UNSUPPORTED_CONTRACT_VERSION: upgrade_required, the queue is kept', async () => {
    const { h, scope } = await setup();
    h.http.queue.push(err('UNSUPPORTED_CONTRACT_VERSION'));
    expect(await h.engine.sendOne(scope)).toBe('stop');
    expect(paused(h)).toEqual(['upgrade_required']);
    expect((await h.store.inFlight(scope))?.items).toHaveLength(2);
  });
  it('UNAUTHENTICATED: refresh once, same batch; second 401 → auth_paused', async () => {
    const { h, scope } = await setup();
    noopAuth.refresh.mockClear();
    h.http.queue.push(err('UNAUTHENTICATED'), err('UNAUTHENTICATED'));
    expect(await h.engine.sendOne(scope)).toBe('sent');
    expect(await h.engine.sendOne(scope)).toBe('stop');
    expect(noopAuth.refresh).toHaveBeenCalledTimes(1);
    expect(paused(h)).toEqual(['auth_paused']);
    expect(new Set(h.http.batches().map((b) => b.batch_id)).size).toBe(1);
  });
  it.each(['TENANT_REQUIRED', 'TENANT_NOT_MEMBER', 'DELEGATED_TOKEN_NOT_ALLOWED'])('%s → auth_paused, not retried', async (code) => {
    const { h, scope } = await setup();
    noopAuth.refresh.mockClear();
    h.http.queue.push(err(code));
    expect(await h.engine.sendOne(scope)).toBe('stop');
    expect(paused(h)).toEqual(['auth_paused']);
    expect(noopAuth.refresh).not.toHaveBeenCalled();
  });
  it.each([
    ['TENANT_CHECK_UNAVAILABLE', 30_000],
    ['STORE_UNAVAILABLE', 30_000],
    ['STORE_PENDING', 5 * 60_000],
  ])('%s → back-off, then the same frozen batch', async (code, base) => {
    const { h, scope } = await setup();
    h.http.queue.push(err(code));
    expect(await h.engine.sendOne(scope)).toBe('wait');
    const b = await h.store.inFlight(scope);
    expect(b!.next_attempt_at - h.clock.now()).toBe(Math.round(base * 0.75));
    expect(await h.engine.sendOne(scope)).toBe('wait');
    h.clock.advance(base);
    expect(await h.engine.sendOne(scope)).toBe('sent');
    const [r1, r2] = ingestReqs(h);
    expect(Buffer.from(r1.body as Uint8Array).equals(Buffer.from(r2.body as Uint8Array))).toBe(true);
  });
  it('STORE_PENDING caps at 24 h, STORE_UNAVAILABLE at 6 h', () => {
    expect(BATCH_ACTIONS.STORE_PENDING).toEqual({ kind: 'backoff', baseMs: 300_000, capMs: 86_400_000 });
    expect(BATCH_ACTIONS.STORE_UNAVAILABLE).toEqual({ kind: 'backoff', baseMs: 30_000, capMs: 21_600_000 });
  });
  it('CONSENT_REQUIRED: batch dropped, each listed category reset for this source', async () => {
    const { h, scope } = await setup([rec('w1'), rec('s1', 'sleep_session', 'sleep')]);
    h.http.queue.push(err('CONSENT_REQUIRED', { categories: ['body', 'sleep'] }));
    expect(await h.engine.sendOne(scope)).toBe('sent');
    expect(await h.store.inFlight(scope)).toBeUndefined();
    expect(h.hooks.events.filter((e) => e.name === 'notConsented').map((e) => e.args[0])).toEqual(['body', 'sleep']);
    expect((await h.store.anchor(scope, 'body_weight')).backfilled).toBe(false);
  });
  it('SOURCE_PAUSED: records purged, deletions kept, committed anchors kept, readers rewound', async () => {
    const { h, scope } = await setup([rec('w1'), del('w0')]);
    h.engine.budget = { ...h.engine.budget, maxDeletions: 1, maxRecords: 1 };
    h.http.queue.push(err('SOURCE_PAUSED'));
    expect(await h.engine.sendOne(scope)).toBe('stop');
    expect(paused(h)).toEqual(['source_paused']);
    const left = [...(await h.store.queued(scope)), ...((await h.store.inFlight(scope))?.items ?? [])];
    expect(left.map((i) => i.kind)).toEqual(['deletion']);
    const a = await h.store.anchor(scope, 'body_weight');
    expect(a.committed_anchor).toBe('r0');
    expect(a.read_anchor).toBe('r0');
  });
  it('INGEST_DISABLED: server_disabled, the batch stays, nothing else is sent', async () => {
    const { h, scope } = await setup();
    h.http.queue.push(err('INGEST_DISABLED', { reason: 'flag_off' }));
    expect(await h.engine.sendOne(scope)).toBe('stop');
    expect(paused(h)).toEqual(['server_disabled']);
    expect(await h.store.inFlight(scope)).toBeDefined();
  });
  it('BATCH_ID_REUSED: unfrozen and rebuilt with a new batch_id', async () => {
    const { h, scope } = await setup();
    h.http.queue.push(err('BATCH_ID_REUSED'));
    expect(await h.engine.sendOne(scope)).toBe('sent');
    expect(await h.engine.sendOne(scope)).toBe('sent');
    expect(h.http.batches().map((b) => b.batch_id)).toEqual([IDS[0], IDS[1]]);
  });
  it('BATCH_TOO_LARGE: split in two with new ids, budget lowered', async () => {
    const { h, scope } = await setup([rec('a'), rec('b'), rec('c'), rec('d')]);
    h.http.queue.push(err('BATCH_TOO_LARGE'));
    await h.engine.sendOne(scope);
    expect(h.engine.budget.maxRecords).toBe(500);
    h.engine.budget = { ...h.engine.budget, maxRecords: 2 };
    await h.engine.sendOne(scope);
    await h.engine.sendOne(scope);
    const bs = h.http.batches();
    expect(bs.map((b) => (b.records as unknown[]).length)).toEqual([4, 2, 2]);
    expect(new Set(bs.map((b) => b.batch_id)).size).toBe(3);
  });
  it('UNSUPPORTED_ENCODING: one retry without gzip, then client_error', async () => {
    const { h, scope } = await setup();
    h.http.queue.push(err('UNSUPPORTED_ENCODING'), err('UNSUPPORTED_ENCODING'));
    expect(await h.engine.sendOne(scope)).toBe('sent');
    expect(await h.engine.sendOne(scope)).toBe('stop');
    const [r1, r2] = ingestReqs(h);
    expect(r1.headers['Content-Encoding']).toBe('gzip');
    expect(r2.headers['Content-Encoding']).toBeUndefined();
    expect(typeof r2.body).toBe('string');
    expect(decodeBody(r2)).toEqual(decodeBody(r1));
    expect(paused(h)).toEqual(['client_error']);
  });
  it('RATE_LIMITED: waits Retry-After (or retry_after_s), then the same batch', async () => {
    const { h, scope } = await setup();
    h.http.queue.push(res(429, { ok: false, error: 'RATE_LIMITED' }, { 'retry-after': '120' }));
    expect(await h.engine.sendOne(scope)).toBe('wait');
    expect((await h.store.inFlight(scope))!.next_attempt_at).toBe(h.clock.now() + 120_000);
    h.clock.advance(120_000);
    h.http.queue.push(res(429, { ok: false, error: 'RATE_LIMITED', retry_after_s: 7 }));
    expect(await h.engine.sendOne(scope)).toBe('wait');
    expect((await h.store.inFlight(scope))!.next_attempt_at).toBe(h.clock.now() + 7_000);
    expect(new Set(h.http.batches().map((b) => b.batch_id)).size).toBe(1);
  });
  it('network error, timeout and non-JSON: back-off and the same frozen bytes', async () => {
    const { h, scope } = await setup();
    h.http.queue.push({ error: 'network' }, { error: 'timeout' }, res(502, undefined));
    for (let i = 0; i < 3; i++) {
      expect(await h.engine.sendOne(scope)).toBe('wait');
      h.clock.advance(7 * 3_600_000);
    }
    const bodies = ingestReqs(h).map((r) => Buffer.from(r.body as Uint8Array).toString('base64'));
    expect(new Set(bodies).size).toBe(1);
  });
  it('a batch unsent after 24 h is rebuilt with a new batch_id', async () => {
    const { h, scope } = await setup();
    h.http.queue.push({ error: 'network' });
    await h.engine.sendOne(scope);
    h.clock.advance(25 * 3_600_000);
    await h.engine.sendOne(scope);
    expect(h.http.batches().map((b) => b.batch_id)).toEqual([IDS[0], IDS[1]]);
  });
});

describe('record codes in a 200', () => {
  const ok = (rejected: { record_id: string; code: string }[]) => res(200, { ok: true, batch_id: 'x', replay: false, counts: {}, rejected });
  it('STORE_UNAVAILABLE → re-sent in a NEW batch; the others are acked', async () => {
    const { h, scope } = await setup([rec('a'), rec('b')]);
    h.http.queue.push(ok([{ record_id: 'b', code: 'STORE_UNAVAILABLE' }]));
    await h.engine.sendOne(scope);
    await h.engine.sendOne(scope);
    const [b1, b2] = h.http.batches();
    expect(b2.batch_id).not.toBe(b1.batch_id);
    expect((b2.records as { record_id: string }[]).map((r) => r.record_id)).toEqual(['b']);
    expect(await h.store.ledgerGet(scope, 'a')).toBeDefined();
  });
  it.each([
    ['UNSUPPORTED_TYPE', true],
    ['UNIT_MISMATCH', true],
    ['IMPLAUSIBLE_VALUE', false],
    ['OUT_OF_WINDOW', false],
    ['INVALID_RECORD', false],
  ])('%s → dropped and counted (contract_mismatch: %s)', async (code, mismatch) => {
    const { h, scope } = await setup([rec('a')]);
    h.http.queue.push(ok([{ record_id: 'a', code }]));
    await h.engine.sendOne(scope);
    expect(await h.store.queueSize(scope)).toBe(0);
    expect(await h.store.ledgerGet(scope, 'a')).toBeUndefined();
    expect(h.hooks.counts[code]).toBe(1);
    expect(h.hooks.events.some((e) => e.name === 'flag' && e.args[0] === 'contract_mismatch')).toBe(mismatch);
  });
});

describe('purge scope (F3): only (this install’s source, that category)', () => {
  async function twoSources() {
    const store = new HealthStore(createMemoryDriver());
    const h = harness({ platform: 'ios', ids: IDS, store });
    const other = harness({ platform: 'ios', ids: IDS, store, installId: '99999999-9999-4999-8999-999999999999' });
    const mine = h.engine.scopeFor('user-a');
    const theirs = other.engine.scopeFor('user-a');
    const items = [rec('w1'), rec('s1', 'sleep_session', 'sleep'), rec('s2', 'sleep_session', 'sleep')];
    await seed(h, mine, items);
    await seed(other, theirs, items);
    return { h, store, mine, theirs };
  }
  const snapshot = async (store: HealthStore, scope: Scope) => ({
    queued: (await store.queued(scope)).map((i) => i.record_id).sort(),
    sleep: await store.anchor(scope, 'sleep_session'),
    body: await store.anchor(scope, 'body_weight'),
  });

  it('CATEGORY_NOT_CONSENTED for sleep on this install', async () => {
    const { h, store, mine, theirs } = await twoSources();
    const before = await snapshot(store, theirs);
    h.engine.budget = { ...h.engine.budget, maxRecords: 2 };
    h.http.queue.push(res(200, { ok: true, batch_id: IDS[0], replay: false, counts: {}, rejected: [{ record_id: 's1', code: 'CATEGORY_NOT_CONSENTED' }] }));
    await h.engine.sendOne(mine);
    const after = await snapshot(store, mine);
    expect(after.queued).toEqual([]); // s2 (sleep, queued) purged; w1 acked
    expect(after.sleep.backfilled).toBe(false);
    expect(after.body.backfilled).toBe(true);
    expect(await store.ledgerGet(mine, 'w1')).toBeDefined();
    expect(await snapshot(store, theirs)).toEqual(before);
  });
  it('403 CONSENT_REQUIRED {sleep}', async () => {
    const { h, store, mine, theirs } = await twoSources();
    const before = await snapshot(store, theirs);
    h.engine.budget = { ...h.engine.budget, maxRecords: 1 };
    h.http.queue.push(err('CONSENT_REQUIRED', { categories: ['sleep'] }));
    await h.engine.sendOne(mine);
    const after = await snapshot(store, mine);
    expect(after.queued).toEqual([]);
    expect(after.sleep.backfilled).toBe(false);
    expect(after.body.backfilled).toBe(true);
    expect(await snapshot(store, theirs)).toEqual(before);
  });
  it('409 SOURCE_PAUSED', async () => {
    const { h, store, mine, theirs } = await twoSources();
    const before = await snapshot(store, theirs);
    h.http.queue.push(err('SOURCE_PAUSED'));
    await h.engine.sendOne(mine);
    expect((await snapshot(store, mine)).queued).toEqual([]);
    expect(await snapshot(store, theirs)).toEqual(before);
  });
});

describe('source block (F1 backstop)', () => {
  it.each([
    ['apple_health', 'android', 'ios'],
    ['health_connect', 'ios', 'android'],
    ['apple_health', 'ios', 'android'],
    ['health_connect', 'android', 'ios'],
  ] as const)('%s/%s on a running %s is refused before send', async (kind, platform, running) => {
    const source = { ...sourceFor('ios', { install_id: '0b7f6d52-3a1e-4c2f-8d9a-1e2f3a4b5c6d', os_version: '1', app_version: '1' }), kind, platform };
    const h = harness({ platform: 'ios', ids: IDS, source, os: running });
    const scope = h.engine.scopeFor('user-a');
    await seed(h, scope, [rec('a')]);
    expect(await h.engine.sendOne(scope)).toBe('stop');
    expect(ingestReqs(h)).toHaveLength(0);
    expect(h.hooks.events.some((e) => e.name === 'flag' && e.args[0] === 'client_error')).toBe(true);
  });
  it('sourceFor is the only producer and throws on any other platform', () => {
    expect(sourceFor('ios', { install_id: 'i', os_version: '1', app_version: '1' })).toMatchObject({ kind: 'apple_health', platform: 'ios' });
    expect(sourceFor('android', { install_id: 'i', os_version: '1', app_version: '1' })).toMatchObject({ kind: 'health_connect', platform: 'android' });
    expect(() => sourceFor('web', { install_id: 'i', os_version: '1', app_version: '1' })).toThrow(/iOS and Android only/);
  });
});
