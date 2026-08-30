/**
 * ReportedContentNew.tsx — Audit-tab query error visibility fix.
 *
 * The admin moderation "Audit" tab's `load()` queried `moderation_actions`
 * with `const { data: a } = await supabase.from("moderation_actions")...`
 * and never checked `error`. A real Postgres-level failure resolves `data`
 * to `null`, and the downstream `(a || [])` fallback made that
 * indistinguishable from "there are genuinely zero moderation actions" —
 * the audit trail would render its empty state with nothing in the console
 * or UI pointing at a DB failure having occurred.
 *
 * Fixed: same pattern as the Reports/Bans tabs in this file — the query
 * now also destructures `error`, logs it via `console.error`, and surfaces
 * it through the existing `notifyError(...)` toast. No change to the
 * unchanged `(a || [])` fallback.
 *
 * Pinned at the source level, matching this file's own established
 * ReportedContentNew.bans-error-logging.test.ts precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'ReportedContentNew.tsx'), 'utf8');

describe('ReportedContentNew — Audit tab query error logging', () => {
  it('destructures `error` from the moderation_actions query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: a, error: auditError \} = await supabase\s*\n\s*\.from\("moderation_actions"\)/
    );
  });

  it('logs and surfaces the error before the unchanged (a || []) usage', () => {
    const idx = SRC.indexOf('.from("moderation_actions")');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);

    expect(after).toMatch(/if \(auditError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('notifyError(');
    expect(after).toContain('setAudit((a || []) as AuditRow[]);');
  });

  it('the error check happens before the (a || []) usage, not after', () => {
    const idx = SRC.indexOf('.from("moderation_actions")');
    const body = SRC.slice(idx, idx + 400);
    const errIdx = body.indexOf('if (auditError) {');
    const useIdx = body.indexOf('setAudit((a || []) as AuditRow[]);');
    expect(errIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
