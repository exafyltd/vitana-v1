/**
 * VTID-05184 — pre-aggregation, the deferral band, the series sample index,
 * an expired Health Connect token, units, sleep grouping and stages
 * (N5a plan change 7, Tests "Aggregation").
 */
import { entriesFor, entryFor } from '../../src/health-sync/contract/v1/catalogue';
import {
  FIVE_MIN_MS,
  ONE_HOUR_MS,
  alignDown,
  bucketStats,
  intervalLengthFor,
  intervalStillValid,
  intervalsTouched,
  regionsFor,
  seriesStats,
} from '../../src/health-sync/aggregate';
import { DEFAULT_BUDGET, fitBatch, selectBatch } from '../../src/health-sync/batcher';
import { MAX_BATCHES_PER_HOUR } from '../../src/health-sync/engine';
import { capStages, groupHealthKitSleep, HC_SLEEP_STAGE, HK_SLEEP_STAGE, type StageSpan } from '../../src/health-sync/sleep';
import { SERIES_INDEX_CAP } from '../../src/health-sync/store/store';
import { healthConnectRecordValue, healthKitToWire, massToKg } from '../../src/health-sync/units';
import type { QueueItem } from '../../src/health-sync/store/types';
import { ALL_TYPES_FOR, FakeHealthConnect, FakeHealthKit, GOLDEN_CLOCK, harness, markBackfilled } from './helpers';

const NOW = GOLDEN_CLOCK;
const DAY = 86_400_000;
const STEPS = 'HKQuantityTypeIdentifierStepCount';
const HR = 'HKQuantityTypeIdentifierHeartRate';
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
const allow = ALL_TYPES_FOR('ios');

describe('interval alignment and the 29/31-day band', () => {
  it('5 minutes from now − 29 d, 1 hour before now − 31 d, deferred between', () => {
    expect(intervalLengthFor(NOW - 29 * DAY, NOW)).toBe(FIVE_MIN_MS);
    expect(intervalLengthFor(NOW - 30 * DAY, NOW)).toBeNull();
    expect(intervalLengthFor(NOW - 31 * DAY - 1, NOW)).toBe(ONE_HOUR_MS);
  });
  it('a sample spanning the boundary touches 5-minute intervals and band hours', () => {
    const cov = intervalsTouched(NOW - 29 * DAY - 20 * 60_000, NOW - 29 * DAY + 10 * 60_000, NOW);
    expect(cov.intervals.every((k) => k.lengthMs === FIVE_MIN_MS)).toBe(true);
    expect(cov.deferredHours.length).toBeGreaterThan(0);
    expect(cov.intervals.every((k) => k.startMs % FIVE_MIN_MS === 0)).toBe(true);
  });
  it('regions are aligned, closed and disjoint; the open interval is reported', () => {
    const { regions, deferredHours, openIntervalStart } = regionsFor(NOW - 90 * DAY, NOW + 1, NOW - 60_000);
    const hour = regions.find((r) => r.lengthMs === ONE_HOUR_MS)!;
    const five = regions.find((r) => r.lengthMs === FIVE_MIN_MS)!;
    expect(hour.fromMs % ONE_HOUR_MS).toBe(0);
    expect(hour.toMs).toBeLessThanOrEqual(alignDown(NOW - 60_000 - 31 * DAY, ONE_HOUR_MS) + ONE_HOUR_MS);
    expect(five.fromMs).toBeGreaterThanOrEqual(NOW - 60_000 - 29 * DAY);
    expect(five.toMs).toBeLessThanOrEqual(NOW - 60_000);
    expect(deferredHours.length).toBeGreaterThanOrEqual(47);
    expect(openIntervalStart).toBe(alignDown(NOW - 60_000, FIVE_MIN_MS));
  });
  it('a queued 5-minute item is invalid once it enters the band', () => {
    const key = { startMs: alignDown(NOW - 28 * DAY, FIVE_MIN_MS), lengthMs: FIVE_MIN_MS };
    expect(intervalStillValid(key, NOW)).toBe(true);
    expect(intervalStillValid(key, NOW + 2 * DAY)).toBe(false);
  });
});

describe('series stats', () => {
  it('heart rate {n,sum,min,max} from samples, bucketed by each sample time', () => {
    const r = { fromMs: NOW - ONE_HOUR_MS, toMs: NOW, lengthMs: FIVE_MIN_MS };
    const s = bucketStats([{ timeMs: NOW - ONE_HOUR_MS + 1, value: 60 }, { timeMs: NOW - ONE_HOUR_MS + 2, value: 80 }, { timeMs: NOW - 1, value: 100 }], r);
    expect(s.get(NOW - ONE_HOUR_MS)).toEqual({ n: 2, sum: 140, min: 60, max: 80 });
    expect(s.get(alignDown(NOW - 1, FIVE_MIN_MS))).toEqual({ n: 1, sum: 100, min: 100, max: 100 });
    expect(seriesStats([])).toBeNull();
  });
});

describe('units', () => {
  it('HealthKit body fat is a fraction → × 100', () => {
    expect(healthKitToWire(entryFor('body_fat_percentage')!, 0.231, '%')).toBe(23.1);
  });
  it('a pound weight is converted to kg (HealthKit and Health Connect)', () => {
    expect(healthKitToWire(entryFor('body_weight')!, 160, 'lb')).toBeCloseTo(72.5748, 3);
    expect(massToKg(160, '[lb_av]')).toBeCloseTo(72.5748, 3);
    expect(healthConnectRecordValue(entryFor('body_weight')!, { weight: { inPounds: 160 } })).toBeCloseTo(72.5748, 3);
    expect(massToKg(1, 'furlong')).toBeNull();
  });
});

describe('device pre-aggregation through the engine', () => {
  it('a deferred band hour stores no value and is re-derived from the OS when due, as a 1-hour item', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk });
    const scope = await markBackfilled(h, 'u', '0');
    const t = alignDown(NOW - 30 * DAY, ONE_HOUR_MS) + 10 * 60_000;
    hk.add(STEPS, { uuid: 'band', startDate: new Date(t), endDate: new Date(t + 60_000), quantity: 100 });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: allow, history: true });
    expect(await h.store.queueSize(scope)).toBe(0);
    const defs = await h.store.deferrals(scope);
    const hourDef = defs.find((x) => x.length_ms === ONE_HOUR_MS)!;
    expect(hourDef).toEqual({ type: 'steps', start_ms: alignDown(t, ONE_HOUR_MS), length_ms: ONE_HOUR_MS, due_ms: expect.any(Number) });
    expect(JSON.stringify(hourDef)).not.toMatch(/100/);
    // The OS value changes before it is due: the due pass re-derives it.
    hk.add(STEPS, { uuid: 'band2', startDate: new Date(t + 120_000), endDate: new Date(t + 180_000), quantity: 23 });
    h.clock.advance(2 * DAY);
    await h.engine.processDeferrals(scope, allow);
    const q = await h.store.queued(scope);
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ kind: 'series', lengthMs: ONE_HOUR_MS, startMs: alignDown(t, ONE_HOUR_MS) });
    expect((q[0].payload as { value: number }).value).toBe(123);
  });

  it('an offline backlog that crossed the boundary is re-derived and paced at ≤ 60 batches per hour', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk });
    const scope = await markBackfilled(h, 'u', '0');
    const t = alignDown(NOW - 28 * DAY - 12 * ONE_HOUR_MS, FIVE_MIN_MS);
    hk.add(STEPS, { uuid: 'old', startDate: new Date(t), endDate: new Date(t + 60_000), quantity: 50 });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: allow, history: true });
    expect(await h.store.queueSize(scope)).toBe(1);
    // Offline for 2 days: the queued 5-minute item is now in the band.
    h.clock.advance(2 * DAY);
    expect(await h.engine.sendOne(scope)).toBe('idle');
    expect(h.http.requests).toHaveLength(0);
    expect(await h.store.queueSize(scope)).toBe(0);
    expect((await h.store.deferrals(scope)).some((x) => x.start_ms === alignDown(t, ONE_HOUR_MS))).toBe(true);
    h.clock.advance(2 * DAY);
    await h.engine.processDeferrals(scope, allow);
    const [item] = await h.store.queued(scope);
    expect(item).toMatchObject({ lengthMs: ONE_HOUR_MS, startMs: alignDown(t, ONE_HOUR_MS) });
    // Pacing: never more than 60 batches in an hour.
    expect(MAX_BATCHES_PER_HOUR).toBe(60);
    await h.store.setState(scope, 'pacing', { hour: Array.from({ length: 60 }, () => h.clock.now() - 1000), day: new Date(h.clock.now()).toISOString().slice(0, 10), dayBatches: 60, dayItems: 60, first_sync_at: h.clock.now() - DAY });
    expect(await h.engine.sendOne(scope)).toBe('wait');
    h.clock.advance(ONE_HOUR_MS);
    expect(await h.engine.sendOne(scope)).toBe('sent');
  });

  it('series_sample_index: TTL sweep at 35 days and the 200,000-row cap; an evicted id → reconciliation, not a wrong deletion', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk });
    const scope = await markBackfilled(h, 'u', '0');
    await h.store.indexPut(scope, 'expired', { type: 'steps', intervals: [], deferredHours: [], end_ms: NOW - 36 * DAY });
    await h.store.indexPut(scope, 'fresh', { type: 'steps', intervals: [], deferredHours: [], end_ms: NOW - DAY });
    expect(await h.store.indexSweep(scope, NOW)).toEqual({ expired: 1, evicted: 0 });
    expect(SERIES_INDEX_CAP).toBe(200_000);
    for (let i = 0; i < 5; i++) await h.store.indexPut(scope, `c${i}`, { type: 'steps', intervals: [], deferredHours: [], end_ms: NOW - (10 - i) * 60_000 });
    expect(await h.store.indexSweep(scope, NOW, 3)).toEqual({ expired: 0, evicted: 3 });
    expect(await h.store.indexCount(scope)).toBe(3);
    // Sent interval, then its sample's index row is evicted and the sample deleted:
    const t = alignDown(NOW - 2 * ONE_HOUR_MS, FIVE_MIN_MS);
    hk.add(STEPS, { uuid: 'a', startDate: new Date(t), endDate: new Date(t + 60_000), quantity: 10 });
    hk.add(STEPS, { uuid: 'b', startDate: new Date(t + 60_000), endDate: new Date(t + 120_000), quantity: 5 });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: allow, history: true });
    while ((await h.engine.sendOne(scope)) === 'sent');
    await h.store.indexTake(scope, 'a'); // evicted
    hk.remove(STEPS, 'a');
    await h.engine.readCategory(scope, 'activity', { allowedTypes: allow, history: true });
    expect(h.hooks.counts.series_reconciliation).toBe(1);
    const q = await h.store.queued(scope);
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ kind: 'series', startMs: t });
    expect((q[0].payload as { value: number }).value).toBe(5); // recomputed, not deleted
  });

  it('an expired Health Connect token re-derives the original backfill window and uploads only the diff', async () => {
    const hc = new FakeHealthConnect();
    hc.granted = [{ accessType: 'read', recordType: 'Steps' }, { accessType: 'read', recordType: 'Weight' }];
    const h = harness({ platform: 'android', hc });
    const scope = h.engine.scopeFor('u');
    const t = alignDown(NOW - 10 * DAY, FIVE_MIN_MS);
    hc.add('Steps', { metadata: { id: 'x1' }, startTime: new Date(t).toISOString(), endTime: new Date(t + 60_000).toISOString(), count: 100 });
    hc.add('Weight', { metadata: { id: 'w1' }, time: new Date(t).toISOString(), weight: { inKilograms: 70 } });
    hc.add('Weight', { metadata: { id: 'w2' }, time: new Date(t + DAY).toISOString(), weight: { inKilograms: 71 } });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('android'), history: true });
    await h.engine.readCategory(scope, 'body', { allowedTypes: ALL_TYPES_FOR('android'), history: true });
    while ((await h.engine.sendOne(scope)) === 'sent');
    const sentBefore = h.http.batches().length;
    // Weeks without a sync: tokens expire; meanwhile one steps interval changed and one weight was deleted.
    hc.add('Steps', { metadata: { id: 'x2' }, startTime: new Date(t + 120_000).toISOString(), endTime: new Date(t + 180_000).toISOString(), count: 7 });
    hc.records.get('Weight')!.delete('w2');
    hc.expired.add('Steps');
    hc.expired.add('Weight');
    await h.engine.readCategory(scope, 'activity', { allowedTypes: ALL_TYPES_FOR('android'), history: true });
    await h.engine.readCategory(scope, 'body', { allowedTypes: ALL_TYPES_FOR('android'), history: true });
    expect(h.hooks.counts.changes_token_expired).toBe(2);
    const q = await h.store.queued(scope);
    expect(q.map((i) => [i.kind, i.record_id]).sort()).toEqual([
      ['deletion', 'w2'],
      ['series', `steps:${new Date(t).toISOString()}`],
    ]);
    expect((q.find((i) => i.kind === 'series')!.payload as { value: number }).value).toBe(107);
    expect(h.http.batches().length).toBe(sentBefore);
  });
});

describe('HealthKit sleep grouping', () => {
  const H = 3_600_000;
  const base = Date.parse('2026-10-12T20:00:00Z');
  const s = (id: string, fromH: number, toH: number, value = 3, sourceKey = 'watch') => ({ id, startMs: base + fromH * H, endMs: base + toH * H, value, sourceKey });

  it('samples with gaps under SLEEP_GROUP_GAP_MIN form one session; record_id = earliest sample', () => {
    const { sessions } = groupHealthKitSleep([s('b', 1, 2, 4), s('a', 0, 1), s('c', 2.5, 4, 5)]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].record_id).toBe('a');
    expect(sessions[0].stages.map((x) => x.stage)).toEqual(['light', 'deep', 'rem']);
  });
  it('SLEEP_GROUP_GAP_MIN is honoured as a config value', () => {
    expect(groupHealthKitSleep([s('a', 0, 1), s('b', 1.5, 2)], { gapMin: 60 }).sessions).toHaveLength(1);
    expect(groupHealthKitSleep([s('a', 0, 1), s('b', 1.5, 2)], { gapMin: 20 }).sessions).toHaveLength(2);
  });
  it('different sources never merge', () => {
    expect(groupHealthKitSleep([s('a', 0, 1, 3, 'watch'), s('b', 0, 1, 3, 'phone')]).sessions).toHaveLength(2);
  });
  it('a group over 24 h is split at its longest gap; an unsplittable one is dropped and counted', () => {
    const split = groupHealthKitSleep([s('a', 0, 10), s('b', 10.5, 20), s('c', 20.9, 30)]);
    expect(split.sessions.map((x) => x.record_id)).toEqual(['a', 'c']);
    expect(split.overCap).toBe(0);
    const solid = groupHealthKitSleep([s('a', 0, 25)]);
    expect(solid.sessions).toHaveLength(0);
    expect(solid.overCap).toBe(1);
  });
  it('stage maps', () => {
    expect(HK_SLEEP_STAGE).toEqual({ 0: 'in_bed', 1: 'asleep', 2: 'awake', 3: 'light', 4: 'deep', 5: 'rem' });
    expect(HC_SLEEP_STAGE).toEqual({ 1: 'awake', 2: 'asleep', 3: 'out_of_bed', 4: 'light', 5: 'deep', 6: 'rem', 7: 'awake' });
    expect(HC_SLEEP_STAGE[0]).toBeUndefined();
  });
  it('more than 200 stages: adjacent same stages merge; still over → no stages', () => {
    const same: StageSpan[] = Array.from({ length: 300 }, (_, i) => ({ stage: i < 150 ? 'light' : 'deep', startMs: i, endMs: i + 1 }));
    expect(capStages(same)).toEqual([
      { stage: 'light', startMs: 0, endMs: 150 },
      { stage: 'deep', startMs: 150, endMs: 300 },
    ]);
    const alternating: StageSpan[] = Array.from({ length: 300 }, (_, i) => ({ stage: i % 2 ? 'light' : 'deep', startMs: i, endMs: i + 1 }));
    expect(capStages(alternating)).toBeUndefined();
  });
  it('regrouping deletes the old record_id and sends the new session (engine)', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk });
    const scope = await markBackfilled(h, 'u', '0');
    hk.add(SLEEP, { uuid: 'first', startDate: new Date(base), endDate: new Date(base + H), value: 3 });
    hk.add(SLEEP, { uuid: 'second', startDate: new Date(base + H), endDate: new Date(base + 3 * H), value: 4 });
    await h.engine.readCategory(scope, 'sleep', { allowedTypes: allow, history: true });
    while ((await h.engine.sendOne(scope)) === 'sent');
    expect(h.http.batches()[0].records).toEqual([expect.objectContaining({ record_id: 'first', value: 180 })]);
    hk.remove(SLEEP, 'first');
    await h.engine.readCategory(scope, 'sleep', { allowedTypes: allow, history: true });
    const q = await h.store.queued(scope);
    expect(q.map((i) => [i.kind, i.record_id]).sort()).toEqual([
      ['deletion', 'first'],
      ['record', 'second'],
    ]);
  });
});

describe('batching', () => {
  const item = (i: number, kind: QueueItem['kind'] = 'record'): QueueItem => ({
    record_id: `r${i}`,
    type: 'body_weight',
    category: 'body',
    kind,
    payload: kind === 'deletion' ? { record_id: `r${i}`, type: 'body_weight' } : { record_id: `r${i}`, type: 'body_weight', value: 70, unit: 'kg', start: '2026-10-13T07:00:00+02:00', end: '2026-10-13T07:00:00+02:00', tz: 'Europe/Berlin' },
    hash: 'h',
    cycle: 1,
    mode: 'incremental',
    seq: i,
  });
  it('≤ 1,000 records and ≤ 1,000 deletions per batch', () => {
    const items = [...Array.from({ length: 1500 }, (_, i) => item(i)), ...Array.from({ length: 1500 }, (_, i) => item(2000 + i, 'deletion'))];
    const sel = selectBatch(items);
    expect(sel.filter((i) => i.kind === 'record')).toHaveLength(1000);
    expect(sel.filter((i) => i.kind === 'deletion')).toHaveLength(1000);
  });
  it('halves until the gzipped size fits the budget', () => {
    const items = Array.from({ length: 1000 }, (_, i) => item(i));
    const fit = fitBatch(items, (sel) => ({ contract_version: '1.0', batch_id: 'b', source: { kind: 'apple_health', install_id: 'i', platform: 'ios', os_version: '1', app_version: '1' }, sync_mode: 'incremental', records: sel.map((s) => s.payload) as never, deletions: [] }), { ...DEFAULT_BUDGET, maxGzipBytes: 2_000 });
    expect(fit!.items.length).toBeLessThan(1000);
    expect(fit!.encoded.sentBytes).toBeLessThanOrEqual(2_000);
  });
});

describe('never-produced inputs (the golden per-record rejections are server answers)', () => {
  it('no mapping and no permission for blood_glucose', async () => {
    expect(entryFor('blood_glucose')).toBeUndefined();
    const hk = new FakeHealthKit();
    const reader = harness({ platform: 'ios', hk }).reader;
    await reader.requestRead(entriesFor('ios'), { history: true, background: true });
    const toRead = (hk.calls[0].args[0] as { toRead: string[] }).toRead;
    expect(toRead.some((id) => /Glucose|Menstrual|Clinical|Ovulation|Sexual/.test(id))).toBe(false);
    expect((hk.calls[0].args[0] as { toShare: string[] }).toShare).toEqual([]);
  });
  it('a sample older than the store window (2024) is never read into the queue', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk });
    const scope = await markBackfilled(h, 'u', '0');
    hk.add('HKQuantityTypeIdentifierBodyMass', { uuid: 'old', startDate: new Date('2024-01-01T08:00:00Z'), endDate: new Date('2024-01-01T08:00:00Z'), quantity: 70, unit: 'kg' });
    hk.add(STEPS, { uuid: 'old-steps', startDate: new Date('2024-01-01T08:00:00Z'), endDate: new Date('2024-01-01T08:05:00Z'), quantity: 10 });
    await h.engine.readCategory(scope, 'body', { allowedTypes: allow, history: true });
    await h.engine.readCategory(scope, 'activity', { allowedTypes: allow, history: true });
    expect(await h.store.queueSize(scope)).toBe(0);
  });
  it('a pound weight from HealthKit goes out in kg', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk });
    const scope = await markBackfilled(h, 'u', '0');
    hk.add('HKQuantityTypeIdentifierBodyMass', { uuid: 'lb', startDate: new Date(NOW - 3_600_000), endDate: new Date(NOW - 3_600_000), quantity: 160, unit: 'lb' });
    await h.engine.readCategory(scope, 'body', { allowedTypes: allow, history: true });
    const [q] = await h.store.queued(scope);
    expect(q.payload).toMatchObject({ unit: 'kg', value: 72.574779 });
  });
  it('a heart-rate interval goes out as {n,sum,min,max} (HealthKit statistics have no count)', async () => {
    const hk = new FakeHealthKit();
    const h = harness({ platform: 'ios', hk });
    const scope = await markBackfilled(h, 'u', '0');
    const t = alignDown(NOW - 3_600_000, FIVE_MIN_MS);
    hk.add(HR, { uuid: 'h1', startDate: new Date(t + 1000), endDate: new Date(t + 1000), quantity: 61 });
    hk.add(HR, { uuid: 'h2', startDate: new Date(t + 2000), endDate: new Date(t + 2000), quantity: 75 });
    await h.engine.readCategory(scope, 'heart', { allowedTypes: allow, history: true });
    const [q] = await h.store.queued(scope);
    expect(q.payload).toMatchObject({ type: 'heart_rate', unit: '/min', stats: { n: 2, sum: 136, min: 61, max: 75 } });
    expect(q.payload).not.toHaveProperty('value');
  });
});
