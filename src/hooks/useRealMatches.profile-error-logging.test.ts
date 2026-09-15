/**
 * useRealMatches.ts's per-match profile resolution — error-visibility fix.
 *
 * get_user_profile_by_identifier previously destructured only `{ data }`.
 * The surrounding code deliberately drops a match whose profile can't be
 * resolved (a documented privacy-visibility case), but that reasoning
 * only covers "profile not visible," not "the RPC itself is broken" — a
 * genuine RPC failure was indistinguishable from the intended drop, so
 * matches could silently vanish from the daily-matches card with nothing
 * logged to tell anyone the RPC is actually failing.
 *
 * Pinned at the source level — this hook has no existing test harness,
 * matching this repo's IntroExperience.orb-placement.test.ts precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useRealMatches.ts'), 'utf8');

describe('useRealMatches — profile resolution RPC error logging', () => {
  it('destructures `error` from get_user_profile_by_identifier, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data, error \} = await supabase\.rpc\("get_user_profile_by_identifier"/,
    );
  });

  it('logs the error when present, before the unchanged `data?.[0]` fallback', () => {
    const idx = SRC.indexOf('const { data, error } = await supabase.rpc("get_user_profile_by_identifier"');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 900);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.warn(');
    expect(after).toContain('return data?.[0];');
  });
});
