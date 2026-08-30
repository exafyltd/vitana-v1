/**
 * ReportedContentNew.tsx — Reports-queue query error visibility fix.
 *
 * The admin moderation "Reports" tab's `load()` queried `content_reports`
 * with `const { data: reps } = await supabase.from("content_reports")...`
 * and never checked `error`. A real Postgres-level failure (RLS change,
 * transient DB error) resolves `data` to `null`, and the downstream
 * `(reps || [])` fallback made that indistinguishable from "there are
 * genuinely zero reports" — the primary moderation queue would render its
 * empty state with nothing in the console or UI pointing at a DB failure
 * having occurred.
 *
 * Fixed: the query now also destructures `error`, logs it via
 * `console.error`, and surfaces it through the same `notifyError(...)`
 * toast this file already uses for the Bans-tab fix and every moderation-
 * action failure — no new UI state introduced, no change to the unchanged
 * `(reps || [])` fallback that everything downstream still reads.
 *
 * Pinned at the source level, matching this file's own established
 * ReportedContentNew.bans-error-logging.test.ts precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'ReportedContentNew.tsx'), 'utf8');

describe('ReportedContentNew — Reports tab query error logging', () => {
  it('destructures `error` from the content_reports query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: reps, error: repsError \} = await supabase\s*\n\s*\.from\("content_reports"\)/
    );
  });

  it('logs and surfaces the error before the unchanged (reps || []) usage', () => {
    const idx = SRC.indexOf('.from("content_reports")');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);

    expect(after).toMatch(/if \(repsError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('notifyError(');
    // The fallback must stay byte-for-byte unchanged.
    expect(after).toContain('const postIds = [...new Set((reps || [])');
  });

  it('the error check happens before the (reps || []) usage, not after', () => {
    const idx = SRC.indexOf('.from("content_reports")');
    const body = SRC.slice(idx, idx + 400);
    const errIdx = body.indexOf('if (repsError) {');
    const useIdx = body.indexOf('const postIds = [...new Set((reps || [])');
    expect(errIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
