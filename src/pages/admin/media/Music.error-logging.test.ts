/**
 * Music.tsx admin moderation queue — error-visibility fix.
 *
 * Same bug as the sibling Videos.tsx (already fixed): the `media_uploads`
 * moderation-queue query destructured only `{ data }`. A DB failure
 * resolved to null/undefined, which the surrounding `|| []` fallback
 * renders as "no music to review" — indistinguishable from a genuinely
 * empty moderation queue, hiding real pending tracks with nothing logged.
 *
 * Fixed: now also destructures `error` and logs it via `console.error`.
 * The fallback is unchanged.
 *
 * Pinned at the source level, matching Videos.error-logging.test.ts's
 * established precedent for this page shape.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'Music.tsx'), 'utf8');

describe('Music (admin) — moderation queue error logging', () => {
  it('destructures `error` from the primary media_uploads query', () => {
    expect(SRC).toContain('const { data, error } = await query;');
  });

  it('logs the query error before the unchanged || [] fallback', () => {
    const idx = SRC.indexOf('const { data, error } = await query;');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('return data || [];');
  });
});
