/**
 * useRealMatches.ts's `fetchMatches()` — error-visibility + wasted-invoke fix.
 *
 * `fetchMatches()` previously destructured only `{ data }` from the
 * `daily_matches` query. A genuine DB failure resolved `data` to null,
 * collapsed to `[]` — indistinguishable from "no matches yet" — with
 * nothing logged. Worse, that `[]` unconditionally triggered a
 * `generate-daily-matches` edge-function invocation on EVERY transient
 * read failure, which does nothing useful (regenerating doesn't fix a
 * broken read) and burns a real edge-function call each time.
 *
 * Fixed: `fetchMatches()` now also returns whether the query errored,
 * logs it, and the generate-then-reread step only runs when the empty
 * result was genuine (no error) — not when the read itself failed.
 *
 * Pinned at the source level — this hook has no existing render-test
 * harness, matching this file's own sibling
 * useRealMatches.profile-error-logging.test.ts precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useRealMatches.ts'), 'utf8');

describe('useRealMatches — daily_matches query error logging', () => {
  it('destructures `error` from the daily_matches query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data, error \} = await supabase\s*\n\s*\.from\("daily_matches"\)/,
    );
  });

  it('logs the error when present, before returning the fallback rows', () => {
    const idx = SRC.indexOf('const { data, error } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 600);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    // Unchanged fallback shape.
    expect(after).toContain('(data as DailyMatchRow[] | null) ?? []');
  });

  it('only invokes generate-daily-matches when the empty result was genuine (no read error)', () => {
    const idx = SRC.indexOf('if (matches.length === 0');
    expect(idx).toBeGreaterThan(-1);
    const line = SRC.slice(idx, SRC.indexOf('\n', idx));
    expect(line).toContain('&& !hadError');
  });
});
