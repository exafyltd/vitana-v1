/**
 * useMessages.ts's per-thread last-message enrichment query — error-
 * visibility fix. Same shape as the already-fixed
 * useTenantMessages.ts/useGlobalMessages.ts last-message queries, but
 * this is a separate hook those fixes never touched.
 *
 * Previously destructured only `{ data: lastMessage }` from a
 * `.maybeSingle()` query. Unlike `.single()`, `.maybeSingle()` resolves
 * zero rows to `{ data: null, error: null }` — there is no PGRST116
 * "no rows" case to exclude here, so every non-null error is a genuine
 * failure and should be logged unconditionally.
 *
 * Fixed: also destructures `error` and logs it via `console.error`.
 * Fallback unchanged.
 *
 * Pinned at the source level — this hook has no existing render-test
 * harness, matching this repo's established source-level-assertion
 * precedent (see useTenantMessages.threads-enrichment-error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useMessages.ts'), 'utf8');

describe('useMessages — last-message enrichment error logging', () => {
  it('destructures `error` from the messages last-message query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: lastMessage, error: lastMessageError \} = await supabase\s*\n\s*\.from\('messages'\)/,
    );
  });

  it('logs any error unconditionally — maybeSingle() has no PGRST116 no-rows case to exclude', () => {
    const idx = SRC.indexOf("const { data: lastMessage, error: lastMessageError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(lastMessageError\) \{/);
    expect(after).toContain('console.error(');
    // Unlike the .single()-based sibling fixes, there is no PGRST116
    // exclusion in the *condition* itself (a bare `if (lastMessageError)`).
    const condition = after.slice(after.indexOf('if (lastMessageError)'), after.indexOf('{', after.indexOf('if (lastMessageError)')) + 1);
    expect(condition).toBe('if (lastMessageError) {');
  });
});
