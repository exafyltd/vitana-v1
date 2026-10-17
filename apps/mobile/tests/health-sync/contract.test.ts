/**
 * VTID-05184 — the vendored contract v1 is hash-pinned, and the hand-written
 * catalogue and code lists match it (N5a plan change 2, Tests "Contract vendoring").
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CATALOGUE_V1, CATEGORIES, CONSENT_KEY } from '../../src/health-sync/contract/v1/catalogue';
import { AUTH_MIDDLEWARE_CODES, BATCH_ERROR_CODES, CONTRACT_VERSION, LIMITS, RECORD_ERROR_CODES } from '../../src/health-sync/contract/v1/wire';
import { BATCH_ACTIONS, RECORD_ACTIONS } from '../../src/health-sync/responses';
import { CONTRACT_DIR, goldenCase } from './helpers';

const sha = (file: string) => createHash('sha256').update(readFileSync(join(CONTRACT_DIR, file))).digest('hex');
const vendor = JSON.parse(readFileSync(join(CONTRACT_DIR, 'VENDOR.json'), 'utf8'));
const lock = JSON.parse(readFileSync(join(CONTRACT_DIR, 'contract-v1.lock.json'), 'utf8'));
const selfCheck = goldenCase('contract self-check').steps[0].response.body;

describe('vendored contract v1', () => {
  it('schema sha256 = VENDOR.json = lock 1.0 (69ee9a4f…)', () => {
    expect(sha('contract-v1.schema.json')).toBe(vendor.schema_sha256);
    expect(lock.versions['1.0']).toBe(vendor.schema_sha256);
    expect(vendor.schema_sha256).toBe('69ee9a4f6648bb7d5d3830820492aaf336b447c167cc9c465087ee1ee0c52913');
  });
  it('golden.json sha256 = VENDOR.json', () => {
    expect(sha('golden.json')).toBe(vendor.golden_sha256);
  });
  it('VENDOR.json names the source repo and commit', () => {
    expect(vendor.source_repo).toBe('exafyltd/vitana-platform');
    expect(vendor.source_commit).toMatch(/^[0-9a-f]{40}$/);
  });
  it('the schema is draft 2020-12, contract 1.0', () => {
    const schema = JSON.parse(readFileSync(join(CONTRACT_DIR, 'contract-v1.schema.json'), 'utf8'));
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema['x-contract-version']).toBe(CONTRACT_VERSION);
    expect(schema.additionalProperties).toBe(false);
  });
});

describe('catalogue.ts = the golden contract catalogue', () => {
  it('same categories, consent keys, types, kinds, units and OS identifiers', () => {
    const fromGolden = selfCheck.catalogue.flatMap((c: { category: string; consent_key: string; codes: Record<string, unknown>[] }) =>
      c.codes.map((code) => ({ category: c.category, consent_key: c.consent_key, type: code.type, kind: code.kind, unit: code.unit, healthkit: code.healthkit, health_connect: code.health_connect })),
    );
    const ours = CATALOGUE_V1.map((e) => ({ category: e.category, consent_key: CONSENT_KEY[e.category], type: e.type, kind: e.kind, unit: e.unit, healthkit: e.healthkit, health_connect: e.health_connect }));
    expect(ours).toEqual(fromGolden);
    expect([...CATEGORIES]).toEqual(selfCheck.catalogue.map((c: { category: string }) => c.category));
  });
  it('limits match', () => {
    expect(selfCheck.limits).toEqual({
      max_compressed_bytes: LIMITS.maxCompressedBytes,
      max_inflated_bytes: LIMITS.maxInflatedBytes,
      max_records: LIMITS.maxRecords,
      max_deletions: LIMITS.maxDeletions,
      too_old_days: LIMITS.tooOldDays,
      future_tolerance_minutes: LIMITS.futureToleranceMinutes,
      default_backfill_days: LIMITS.defaultBackfillDays,
      five_minute_window_days: LIMITS.fiveMinuteWindowDays,
    });
    expect(selfCheck.contract_version).toBe(CONTRACT_VERSION);
  });
});

describe('error codes = the golden error_codes', () => {
  it('record codes', () => {
    expect([...RECORD_ERROR_CODES]).toEqual(selfCheck.error_codes.record);
    expect(Object.keys(RECORD_ACTIONS).sort()).toEqual([...selfCheck.error_codes.record].sort());
  });
  it('batch codes with status and retryable', () => {
    expect(BATCH_ERROR_CODES).toEqual(selfCheck.error_codes.batch);
  });
  it('every batch and middleware code has an action', () => {
    expect(Object.keys(BATCH_ACTIONS).sort()).toEqual([...Object.keys(BATCH_ERROR_CODES), ...Object.keys(AUTH_MIDDLEWARE_CODES)].sort());
  });
});
