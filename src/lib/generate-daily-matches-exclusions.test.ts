/**
 * VTID-04828 (CLAUDE.md rule 45): the generate-daily-matches edge function
 * never suggests a registered test, service or automation account as a real
 * member's match. Pinned at the source level — the edge function has no
 * runtime harness here, matching the sibling edge-function source tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, '../../supabase/functions/generate-daily-matches/index.ts'), 'utf8');

describe('generate-daily-matches excludes test and service accounts', () => {
  it('reads both allowlists with the service-role client', () => {
    expect(SRC).toContain("supabase.from('service_bot_accounts').select('user_id')");
    expect(SRC).toContain("supabase.from('notification_test_actors').select('user_id')");
  });

  it('removes them from the candidate pool before scoring', () => {
    const excl = SRC.indexOf("supabase.from('service_bot_accounts')");
    const filter = SRC.indexOf('!excluded.has(id)');
    const scoring = SRC.indexOf('const candidateIds = visibleIds');
    expect(excl).toBeGreaterThan(-1);
    expect(filter).toBeGreaterThan(excl);
    expect(scoring).toBeGreaterThan(filter);
  });

  it('logs a failed lookup instead of failing the generation', () => {
    expect(SRC).toContain("console.warn('[generate-daily-matches] test/service account lookup failed:'");
  });
});
