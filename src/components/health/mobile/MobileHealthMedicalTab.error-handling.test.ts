/**
 * MobileHealthMedicalTab.tsx — lab_reports fetch swallowed-error bug.
 *
 * The `lab-reports` query previously caught its own `error` and did
 * `console.error(...); return [];` — this made a real DB failure resolve
 * `useQuery` to a successful, empty result. `isError` never became `true`,
 * so the UI rendered the "no reports" empty state identically to a user who
 * genuinely has zero lab reports (real medical/lab data), with no way to
 * tell the two apart.
 *
 * Fixed: the queryFn now `throw`s on error instead of swallowing it, so
 * `useQuery` enters its real error state, and the component renders a
 * distinct "couldn't load your reports" state with a retry button instead
 * of falling through to the empty-state UI.
 *
 * This component has no existing render-test harness; per this repo's own
 * established pattern (see useCalendarEvents.error-logging-abort.test.ts),
 * this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'MobileHealthMedicalTab.tsx'), 'utf8');

describe('MobileHealthMedicalTab — lab_reports fetch error handling', () => {
  it('throws the error instead of swallowing it into an empty array', () => {
    const idx = SRC.indexOf("const { data, error } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 300);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain("console.error('Error fetching lab reports:', error);");
    expect(after).toContain('throw error;');
    expect(after).not.toMatch(/if \(error\) \{[^}]*return \[\];/s);
  });

  it('destructures isError and refetch from the query', () => {
    expect(SRC).toMatch(/const \{ data: labReports = \[\], isLoading, isError, refetch \} = useQuery/);
  });

  it('renders a distinct error state with a retry action, before the empty-state branch', () => {
    const errIdx = SRC.indexOf('if (isError) {');
    expect(errIdx).toBeGreaterThan(-1);
    const after = SRC.slice(errIdx, errIdx + 700);
    expect(after).toContain("translate('health.reportsLoadFailed')");
    expect(after).toContain("translate('health.reportsLoadFailedDesc')");
    expect(after).toContain('refetch()');

    // The isError check must come before the isLoading===false / empty-state
    // render path, so a real error never falls through to "no reports".
    const loadingIdx = SRC.indexOf('if (isLoading) {');
    const emptyStateIdx = SRC.indexOf('labReports.length === 0');
    expect(errIdx).toBeGreaterThan(loadingIdx);
    expect(emptyStateIdx).toBeGreaterThan(errIdx);
  });
});
