/**
 * VTID-05184 — 500 seeded random sample sets (both platforms, every type,
 * DST days for Europe/Berlin and America/New_York, sleep across midnight):
 * every produced batch validates against the vendored schema, respects
 * 1,000 records / 1,000 deletions / 200 stages and the size budget, carries
 * the platform's own source block, and record timestamps carry the zone's
 * real offset at that instant.
 */
import { gzip, ungzip } from 'pako';
import { DEFAULT_BUDGET, utf8Length } from '../../src/health-sync/batcher';
import { tzOffsetMinutes } from '../../src/health-sync/time';
import { ALL_TYPES_FOR, FakeHealthConnect, FakeHealthKit, harness, prng, validateBatch } from './helpers';
import type { Category } from '../../src/health-sync/contract/v1/catalogue';

const DST_NOWS = [
  { tz: 'Europe/Berlin', now: Date.parse('2026-03-30T12:00:00Z') }, // spring forward 2026-03-29
  { tz: 'Europe/Berlin', now: Date.parse('2026-10-26T12:00:00Z') }, // fall back 2026-10-25
  { tz: 'America/New_York', now: Date.parse('2026-03-09T18:00:00Z') }, // 2026-03-08
  { tz: 'America/New_York', now: Date.parse('2026-11-02T18:00:00Z') }, // 2026-11-01
];
const H = 3_600_000;
const M = 60_000;
const CATS: Category[] = ['activity', 'sleep', 'heart', 'body'];

function iso(ms: number) {
  return new Date(ms).toISOString();
}

function fill(platform: 'ios' | 'android', rnd: () => number, now: number) {
  const hk = new FakeHealthKit();
  const hc = new FakeHealthConnect();
  let n = 0;
  const id = () => `${platform}-${(n++).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
  const at = (maxHoursBack: number) => Math.floor(now - rnd() * maxHoursBack * H);
  const count = 5 + Math.floor(rnd() * 25);
  for (let i = 0; i < count; i++) {
    // recent (5-minute region, incl. the DST night), band and old (1-hour region)
    const back = rnd() < 0.7 ? 72 : rnd() < 0.5 ? 32 * 24 : 80 * 24;
    const s = at(back);
    const e = Math.min(now - M, s + Math.floor(rnd() * 20) * M);
    if (platform === 'ios') {
      hk.add('HKQuantityTypeIdentifierStepCount', { uuid: id(), startDate: new Date(s), endDate: new Date(e), quantity: Math.floor(rnd() * 900) + 1 });
      hk.add('HKQuantityTypeIdentifierActiveEnergyBurned', { uuid: id(), startDate: new Date(s), endDate: new Date(e), quantity: rnd() * 50 });
      hk.add('HKQuantityTypeIdentifierAppleExerciseTime', { uuid: id(), startDate: new Date(s), endDate: new Date(e), quantity: Math.floor(rnd() * 5) + 1 });
      hk.add('HKQuantityTypeIdentifierDistanceWalkingRunning', { uuid: id(), startDate: new Date(s), endDate: new Date(e), quantity: rnd() * 800 });
      hk.add('HKQuantityTypeIdentifierHeartRate', { uuid: id(), startDate: new Date(s), endDate: new Date(s), quantity: 50 + Math.floor(rnd() * 100) });
      if (rnd() < 0.3) hk.add('HKWorkoutType', { uuid: id(), startDate: new Date(s), endDate: new Date(s + 40 * M), sourceRevision: { source: { bundleIdentifier: 'com.apple.health' } } });
      if (rnd() < 0.3) hk.add('HKQuantityTypeIdentifierRestingHeartRate', { uuid: id(), startDate: new Date(s), endDate: new Date(s), quantity: 55 });
      if (rnd() < 0.3) hk.add('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', { uuid: id(), startDate: new Date(s), endDate: new Date(s), quantity: 40 });
      if (rnd() < 0.3) hk.add('HKQuantityTypeIdentifierBodyMass', { uuid: id(), startDate: new Date(s), endDate: new Date(s), quantity: 60 + rnd() * 40, unit: 'kg' });
      if (rnd() < 0.3) hk.add('HKQuantityTypeIdentifierBodyFatPercentage', { uuid: id(), startDate: new Date(s), endDate: new Date(s), quantity: 0.1 + rnd() * 0.3, unit: '%' });
    } else {
      hc.add('Steps', { metadata: { id: id() }, startTime: iso(s), endTime: iso(e), count: Math.floor(rnd() * 900) + 1 });
      hc.add('ActiveCaloriesBurned', { metadata: { id: id() }, startTime: iso(s), endTime: iso(e), energy: { inKilocalories: rnd() * 50 } });
      hc.add('Distance', { metadata: { id: id() }, startTime: iso(s), endTime: iso(e), distance: { inMeters: rnd() * 800 } });
      hc.add('HeartRate', { metadata: { id: id() }, startTime: iso(s), endTime: iso(e), samples: [{ time: iso(s), beatsPerMinute: 50 + Math.floor(rnd() * 100) }, { time: iso(e), beatsPerMinute: 60 }] });
      if (rnd() < 0.3) hc.add('ExerciseSession', { metadata: { id: id(), dataOrigin: 'com.google.android.apps.fitness' }, startTime: iso(s), endTime: iso(s + 30 * M) });
      if (rnd() < 0.3) hc.add('RestingHeartRate', { metadata: { id: id() }, time: iso(s), beatsPerMinute: 55 });
      if (rnd() < 0.3) hc.add('HeartRateVariabilityRmssd', { metadata: { id: id() }, time: iso(s), heartRateVariabilityMillis: 42 });
      if (rnd() < 0.3) hc.add('Weight', { metadata: { id: id() }, time: iso(s), weight: { inKilograms: 60 + rnd() * 40 } });
      if (rnd() < 0.3) hc.add('BodyFat', { metadata: { id: id() }, time: iso(s), percentage: { value: 10 + rnd() * 30 } });
    }
  }
  // A night across midnight (local), sometimes with many stage flips (> 200 → merged or dropped).
  const nights = 1 + Math.floor(rnd() * 2);
  for (let k = 0; k < nights; k++) {
    const bed = now - (k + 1) * 24 * H - 2 * H - Math.floor(rnd() * 2 * H);
    const flips = rnd() < 0.2 ? 260 : 6 + Math.floor(rnd() * 20);
    const step = Math.floor((7 * H) / flips);
    if (platform === 'ios') {
      for (let f = 0; f < flips; f++) hk.add('HKCategoryTypeIdentifierSleepAnalysis', { uuid: id(), startDate: new Date(bed + f * step), endDate: new Date(bed + (f + 1) * step), value: [3, 4, 5, 2][f % 4] });
    } else {
      const stages = Array.from({ length: flips }, (_, f) => ({ stage: [4, 5, 6, 1][f % 4], startTime: iso(bed + f * step), endTime: iso(bed + (f + 1) * step) }));
      hc.add('SleepSession', { metadata: { id: id() }, startTime: iso(bed), endTime: iso(bed + flips * step), stages });
    }
  }
  hc.granted = ['Steps', 'ActiveCaloriesBurned', 'ExerciseSession', 'Distance', 'SleepSession', 'HeartRate', 'RestingHeartRate', 'HeartRateVariabilityRmssd', 'Weight', 'BodyFat'].map((recordType) => ({ accessType: 'read', recordType }));
  return { hk, hc };
}

const OFFSET = /([+-])(\d{2}):(\d{2})$/;

describe('500 random sample sets', () => {
  it('every batch validates and respects the limits and the source block', async () => {
    const rnd = prng(0x5184);
    let batches = 0;
    let stagedSessions = 0;
    for (let i = 0; i < 500; i++) {
      const platform = i % 2 === 0 ? 'ios' : 'android';
      const { tz, now } = DST_NOWS[i % DST_NOWS.length];
      const { hk, hc } = fill(platform, rnd, now);
      const h = harness({ platform, hk, hc, now, tz, ids: [] });
      const scope = h.engine.scopeFor('user-r');
      for (const c of CATS) await h.engine.readCategory(scope, c, { allowedTypes: ALL_TYPES_FOR(platform), history: true });
      for (let k = 0; k < 50; k++) {
        if ((await h.engine.sendOne(scope)) !== 'sent') break;
      }
      for (const req of h.http.requests.filter((r) => r.url.endsWith('/api/v1/health/ingest'))) {
        const body = JSON.parse(ungzip(req.body as Uint8Array, { to: 'string' })) as {
          source: { kind: string; platform: string };
          sync_mode: string;
          records: { type: string; start: string; end: string; tz: string; stages?: unknown[]; record_id: string }[];
          deletions: unknown[];
        };
        batches += 1;
        const ok = validateBatch(body);
        if (!ok) throw new Error(`case ${i}: ${JSON.stringify(validateBatch.errors?.slice(0, 3))}`);
        expect(body.records.length).toBeLessThanOrEqual(1000);
        expect(body.deletions.length).toBeLessThanOrEqual(1000);
        const json = JSON.stringify(body);
        expect(utf8Length(json)).toBeLessThanOrEqual(DEFAULT_BUDGET.maxJsonBytes);
        expect(gzip(json).length).toBeLessThanOrEqual(DEFAULT_BUDGET.maxGzipBytes);
        expect(body.source).toMatchObject(platform === 'ios' ? { kind: 'apple_health', platform: 'ios' } : { kind: 'health_connect', platform: 'android' });
        expect(body.sync_mode).toBe('backfill');
        for (const r of body.records) {
          if (r.stages) {
            expect(r.stages.length).toBeLessThanOrEqual(200);
            stagedSessions += 1;
          }
          if (r.record_id.startsWith(`${r.type}:`)) continue; // series items are UTC
          const m = OFFSET.exec(r.start);
          expect(m).not.toBeNull();
          const off = (m![1] === '-' ? -1 : 1) * (Number(m![2]) * 60 + Number(m![3]));
          expect(off).toBe(tzOffsetMinutes(Date.parse(r.start), r.tz));
        }
      }
    }
    expect(batches).toBeGreaterThanOrEqual(500);
    expect(stagedSessions).toBeGreaterThan(100);
  }, 240_000);
});
