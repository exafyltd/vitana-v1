/**
 * VTID-04398 — no source file or committed build env may point at a GCP
 * Cloud Run host. GCP billing was disabled 2026-08-16 and those hosts are
 * gone; a fallback to one fails every request it serves.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveOperatorApi, DEFAULT_OPERATOR_API, GATEWAY_API_URL } from './gateway-base';

const ROOT = join(__dirname, '..');
const DEAD = /[a-z0-9-]+\.(?:[a-z0-9-]+\.)?run\.app/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('no dead GCP hosts', () => {
  it('no non-test source file under src/ references a *.run.app host', () => {
    const hits = walk(ROOT)
      .filter((f) => !f.endsWith('gateway-base.ts'))
      .filter((f) => DEAD.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
  it('the committed .env points no VITE_* var at a *.run.app host', () => {
    const env = readFileSync(join(ROOT, '..', '.env'), 'utf8');
    expect(env).not.toMatch(DEAD);
  });
});

describe('resolveOperatorApi', () => {
  it('keeps a configured AWS operator url, trailing slash stripped', () => {
    expect(resolveOperatorApi('https://dr-oasis-operator.vitanaland.com/api/v1/')).toBe('https://dr-oasis-operator.vitanaland.com/api/v1');
  });
  it('replaces an unset or dead Cloud Run value with the AWS operator', () => {
    expect(resolveOperatorApi(undefined)).toBe(DEFAULT_OPERATOR_API);
    expect(resolveOperatorApi('https://oasis-operator-86804897789.us-central1.run.app/api/v1')).toBe(DEFAULT_OPERATOR_API);
  });
  it('GATEWAY_API_URL is the gateway origin plus /api/v1', () => {
    expect(GATEWAY_API_URL).toMatch(/^https:\/\/[^/]+\/api\/v1$/);
  });
});
