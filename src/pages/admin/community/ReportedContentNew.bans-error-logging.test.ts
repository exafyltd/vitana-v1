/**
 * ReportedContentNew.tsx — Bans-tab query error visibility fix.
 *
 * The admin moderation "Bans" tab's `load()` queried `user_suspensions`
 * with `const { data: b } = await supabase.from("user_suspensions")...` and
 * never checked `error`. A real Postgres-level failure (RLS change,
 * transient DB error) resolves `data` to `null`, and the downstream
 * `(b || [])` fallback made that indistinguishable from "there are
 * genuinely zero active suspensions" — the Bans tab would render its empty
 * state (`modNoBans`) with nothing in the console or UI pointing at a DB
 * failure having occurred.
 *
 * Fixed: the query now also destructures `error`, logs it via
 * `console.error`, and surfaces it through the same `notifyError(...)`
 * toast this file already uses for every other moderation-action failure
 * (removePost/banAuthor/dismiss/unban) — no new UI state introduced, no
 * change to the unchanged `(b || [])` fallback that everything downstream
 * still reads.
 *
 * ReportedContentNew.tsx (a large admin page: AppLayout, AdminTabs,
 * realtime subscriptions, three tab views) has no existing render-test
 * harness; per this repo's own established pattern for source-level
 * assertions where the moving parts can't practically be exercised through
 * a component render (see useTenant.error-logging.test.ts /
 * useAdminCommunity.error-surfacing.test.ts / PublicEventLanding.ticket-
 * check-error-logging.test.ts), this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'ReportedContentNew.tsx'), 'utf8');

describe('ReportedContentNew — Bans tab query error logging', () => {
  it('destructures `error` from the user_suspensions query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: b, error: bansError \} = await supabase\.from\("user_suspensions"\)/
    );
  });

  it('logs and surfaces the error before falling back to the unchanged (b || []) behavior', () => {
    const idx = SRC.indexOf('.from("user_suspensions")');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);

    expect(after).toMatch(/if \(bansError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('notifyError(');
    // The fallback must stay byte-for-byte unchanged: still whatever `b`
    // resolved to, defaulting to an empty array.
    expect(after).toContain('const banIds = [...new Set((b || []).map((x) => x.user_id))];');
  });

  it('the error check happens before the (b || []) usage, not after', () => {
    const idx = SRC.indexOf('.from("user_suspensions")');
    const body = SRC.slice(idx, idx + 500);
    const errIdx = body.indexOf('if (bansError) {');
    const useIdx = body.indexOf('const banIds = [...new Set((b || [])');
    expect(errIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
