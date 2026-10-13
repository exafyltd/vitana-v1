/**
 * VTID-05184 — StorePort conformance suite (N5a plan change 8, Tests
 * "Anchors"). Runs against the in-memory driver in CI; the same suite runs
 * against the SQLCipher driver on a G1 device. Also checks the SQLite driver's
 * SQL against a recorded fake database.
 */
import { HealthStore, MAX_QUEUED_ITEMS, type NewItem } from '../../src/health-sync/store/store';
import { createMemoryDriver } from '../../src/health-sync/store/memory-driver';
import { createSqliteDriver, schemaSql, type SqlDb } from '../../src/health-sync/store/sqlite-driver';
import { TABLES, type Scope, type TableDriver } from '../../src/health-sync/store/types';
import { ALL_TYPES_FOR, FakeHealthKit, GOLDEN_CLOCK, harness, markBackfilled } from './helpers';

const A: Scope = { user_id: 'user-a', install_id: 'i-1', kind: 'apple_health' };
const B: Scope = { user_id: 'user-b', install_id: 'i-1', kind: 'apple_health' };

const item = (id: string, cycle: number, extra: Partial<NewItem> = {}): NewItem => ({
  record_id: id,
  type: 'body_weight',
  category: 'body',
  kind: 'record',
  payload: { record_id: id, type: 'body_weight', value: 1, unit: 'kg', start: '2026-10-13T07:00:00Z', end: '2026-10-13T07:00:00Z', tz: 'UTC' },
  hash: `h-${id}`,
  cycle,
  mode: 'incremental',
  ...extra,
});

export function conformance(name: string, makeDriver: () => TableDriver) {
  describe(`StorePort conformance — ${name}`, () => {
    let store: HealthStore;
    beforeEach(() => {
      store = new HealthStore(makeDriver());
    });

    it('FIFO queue with coalescing by record_id; identical items are skipped', async () => {
      const c = await store.openCycle(A, 'body_weight', 'x');
      expect(await store.enqueue(A, [item('a', c), item('b', c)])).toEqual({ added: 2, replaced: 0, skipped: 0 });
      expect(await store.enqueue(A, [item('a', c)])).toEqual({ added: 0, replaced: 0, skipped: 1 });
      expect(await store.enqueue(A, [item('a', c, { hash: 'new' })])).toEqual({ added: 0, replaced: 1, skipped: 0 });
      expect((await store.queued(A)).map((i) => [i.record_id, i.hash])).toEqual([
        ['b', 'h-b'],
        ['a', 'new'],
      ]);
    });

    it('committed_anchor advances only when every item of the cycle and earlier cycles is acked', async () => {
      const c1 = await store.openCycle(A, 'body_weight', 'anchor-1');
      await store.enqueue(A, [item('a', c1)]);
      const c2 = await store.openCycle(A, 'body_weight', 'anchor-2');
      await store.enqueue(A, [item('b', c2)]);
      expect(await store.anchor(A, 'body_weight')).toMatchObject({ read_anchor: 'anchor-2', committed_anchor: null });
      const [, b] = await store.takeQueued(A, ['a', 'b'], false);
      await store.release(A, [b]); // cycle 2 done, cycle 1 not
      await store.advanceCommitted(A);
      expect((await store.anchor(A, 'body_weight')).committed_anchor).toBeNull();
      await store.release(A, [{ ...item('a', c1), seq: 1 }]);
      await store.advanceCommitted(A);
      expect((await store.anchor(A, 'body_weight')).committed_anchor).toBe('anchor-2');
    });

    it('a simulated queue loss restarts the reader from committed_anchor', async () => {
      const c1 = await store.openCycle(A, 'body_weight', 'anchor-1');
      await store.enqueue(A, [item('a', c1)]);
      await store.release(A, await store.takeQueued(A, ['a'], false));
      await store.advanceCommitted(A);
      const c2 = await store.openCycle(A, 'body_weight', 'anchor-2');
      await store.enqueue(A, [item('b', c2)]);
      await store.driver.deleteScope('items', 'user-a|i-1|apple_health'); // the OS cleared the cache
      expect(await store.recoverQueueLoss(A)).toEqual(['body_weight']);
      expect(await store.anchor(A, 'body_weight')).toMatchObject({ read_anchor: 'anchor-1', committed_anchor: 'anchor-1' });
    });

    it('one frozen batch per source; unfreeze puts items back unless a newer one is queued', async () => {
      const c = await store.openCycle(A, 'body_weight', 'x');
      await store.enqueue(A, [item('a', c), item('b', c)]);
      const taken = await store.takeQueued(A, ['a', 'b'], false);
      await store.saveBatch(A, { batch_id: 'b1', items: taken, mode: 'incremental', frozen_at: 1, attempts: 0, next_attempt_at: 1, last_error: null, json: '{}', gzip: true, auth_retried: false });
      await store.enqueue(A, [item('a', c, { hash: 'newer' })]);
      await store.unfreeze(A);
      expect((await store.queued(A)).map((i) => [i.record_id, i.hash]).sort()).toEqual([
        ['a', 'newer'],
        ['b', 'h-b'],
      ]);
      expect(await store.inFlight(A)).toBeUndefined();
    });

    it('rows are scoped per (user, install, kind); member switch wipes the others', async () => {
      const c = await store.openCycle(A, 'body_weight', 'x');
      await store.enqueue(A, [item('a', c)]);
      await store.enqueue(B, [item('z', 1)]);
      await store.ledgerPut(B, 'z', { type: 'body_weight', hash: 'h', start_ms: 1, length_ms: null });
      await store.setState(null, 'contract_check', { app_version: '1', allowed: [] });
      expect(await store.queueSize(A)).toBe(1);
      await store.wipeOtherMembers('user-a');
      expect(await store.queueSize(B)).toBe(0);
      expect(await store.ledgerGet(B, 'z')).toBeUndefined();
      expect(await store.queueSize(A)).toBe(1);
      expect(await store.getState(null, 'contract_check')).toBeDefined(); // global rows stay
      await store.wipeOtherMembers(null);
      expect(await store.queueSize(A)).toBe(0);
    });

    it('lease: one pass at a time, expires after its TTL', async () => {
      expect(await store.tryLease('fg', 0, 120_000)).toBe(true);
      expect(await store.tryLease('bg', 1_000, 120_000)).toBe(false);
      expect(await store.tryLease('bg', 121_000, 120_000)).toBe(true);
      await store.releaseLease('bg');
      expect(await store.tryLease('fg', 122_000, 120_000)).toBe(true);
    });

    it('ledger ranges and pruning by start', async () => {
      await store.ledgerPut(A, 'x', { type: 'steps', hash: 'h', start_ms: 100, length_ms: 300_000 });
      await store.ledgerPut(A, 'y', { type: 'steps', hash: 'h', start_ms: 200, length_ms: 300_000 });
      await store.ledgerPut(A, 'z', { type: 'distance', hash: 'h', start_ms: 150, length_ms: 300_000 });
      expect((await store.ledgerRange(A, 'steps', 0, 1000)).map((r) => r.record_id)).toEqual(['x', 'y']);
      expect(await store.ledgerPrune(A, 160)).toBe(2);
      expect((await store.ledgerRange(A, 'steps', 0, 1000)).map((r) => r.record_id)).toEqual(['y']);
    });
  });
}

conformance('memory driver', createMemoryDriver);

describe('SQLite driver', () => {
  it('creates every table with (scope, k) keys and an ord index', () => {
    const sql = schemaSql();
    for (const t of TABLES) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${t} (scope TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, ord REAL NOT NULL DEFAULT 0, PRIMARY KEY (scope, k));`);
      expect(sql).toContain(`CREATE INDEX IF NOT EXISTS ${t}_ord ON ${t} (scope, ord);`);
    }
  });
  it('binds every value as a parameter (no value is interpolated into SQL)', async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const db: SqlDb = {
      execAsync: async () => undefined,
      runAsync: async (sql, params) => {
        calls.push({ sql, params });
      },
      getFirstAsync: async (sql, params) => {
        calls.push({ sql, params });
        return null;
      },
      getAllAsync: async (sql, params) => {
        calls.push({ sql, params });
        return [];
      },
    };
    const d = createSqliteDriver(db);
    await d.put('items', "u'1|i|k", "it's", { v: "x'); DROP TABLE items;--" }, 3);
    await d.list('items', 's', { ordMin: 1, ordMax: 2, limit: 5 });
    await d.get('sent_ledger', 's', 'k');
    for (const c of calls) expect(c.sql).not.toMatch(/DROP|u'1|it's/);
    expect(calls[0].params).toEqual(["u'1|i|k", "it's", JSON.stringify({ v: "x'); DROP TABLE items;--" }), 3]);
  });
});

describe('bounds', () => {
  it('at most 50,000 queued items: readers pause and the read anchor does not move', async () => {
    expect(MAX_QUEUED_ITEMS).toBe(50_000);
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk });
    const scope = await markBackfilled(h, 'u', '0');
    const spy = jest.spyOn(h.store, 'queueSize').mockResolvedValue(50_000);
    hk.add('HKQuantityTypeIdentifierBodyMass', { uuid: 'w', startDate: new Date(GOLDEN_CLOCK - 3_600_000), endDate: new Date(GOLDEN_CLOCK - 3_600_000), quantity: 70, unit: 'kg' });
    expect(await h.engine.readCategory(scope, 'body', { allowedTypes: ALL_TYPES_FOR('ios'), history: true })).toBe(0);
    expect((await h.store.anchor(scope, 'body_weight')).read_anchor).toBe('0');
    expect(h.hooks.counts.queue_full).toBe(1);
    spy.mockRestore();
  });
});
