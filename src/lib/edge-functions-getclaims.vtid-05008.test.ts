// VTID-05008 — an edge function that calls auth.getClaims() must import a
// supabase-js whose auth client has it (2.50+; auth-js 2.71.1 ships with 2.57.2).
// supabase-js 2.39.3 resolves @supabase/gotrue-js ^2.60, which has no getClaims,
// so such a function throws on every request once deployed. VTID-04926 added
// getClaims to get-proactive-context and generate-proactive-greeting on 2.39.3;
// push deploys are frozen, so it never shipped, but the next deploy would have.
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');
const FUNCTIONS = join(ROOT, 'supabase/functions');
const MIN_MINOR = 50;

function supabaseJsVersions(src: string): string[] {
  return Array.from(src.matchAll(/esm\.sh\/@supabase\/supabase-js@([0-9.]+)/g)).map((m) => m[1]);
}

describe('edge functions that call auth.getClaims()', () => {
  const callers = readdirSync(FUNCTIONS)
    .filter((d) => statSync(join(FUNCTIONS, d)).isDirectory())
    .map((d) => join(FUNCTIONS, d, 'index.ts'))
    .filter((f) => existsSync(f) && readFileSync(f, 'utf8').includes('.auth.getClaims('));

  it('finds the known callers', () => {
    const names = callers.map((f) => f.split('/').slice(-2, -1)[0]);
    expect(names).toEqual(expect.arrayContaining(['get-proactive-context', 'generate-proactive-greeting']));
  });

  it.each(callers.map((f) => [f.split('/').slice(-2, -1)[0], f]))('%s imports a supabase-js that has getClaims (2.50+)', (_name, file) => {
    const versions = supabaseJsVersions(readFileSync(file as string, 'utf8'));
    expect(versions.length).toBeGreaterThan(0);
    for (const v of versions) {
      const [major, minor] = v.split('.').map(Number);
      expect(major).toBe(2);
      // A bare "@2" floats to the latest 2.x, which has getClaims.
      if (!Number.isNaN(minor)) expect(minor).toBeGreaterThanOrEqual(MIN_MINOR);
    }
  });
});
