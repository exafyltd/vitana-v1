/**
 * MyBiology.tsx — lab_reports fetch swallowed-error bug (duplicate of the
 * same logic in MobileHealthMedicalTab.tsx, fixed identically).
 *
 * The `lab-reports` query previously caught its own `error` and did
 * `console.error(...); return [];` — a real DB failure resolved `useQuery`
 * to a successful, empty result, so the medical/omics tabs rendered their
 * "no reports yet" empty state identically to a genuine zero-reports case.
 *
 * Fixed: the queryFn now `throw`s on error instead of swallowing it, so
 * `useQuery` enters its real error state (`reportsError`), and both the
 * Medical and Omics tabs render a distinct "couldn't load your reports"
 * state with a retry action instead of the empty state.
 *
 * This page has no existing render-test harness; per this repo's own
 * established pattern, this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'MyBiology.tsx'), 'utf8');

describe('MyBiology — lab_reports fetch error handling', () => {
  it('throws the error instead of swallowing it into an empty array', () => {
    const idx = SRC.indexOf("const { data, error } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 300);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain("console.error('Error fetching lab reports:', error);");
    expect(after).toContain('throw error;');
    expect(after).not.toMatch(/if \(error\) \{[^}]*return \[\];/s);
  });

  it('destructures isError as reportsError from the lab-reports query', () => {
    expect(SRC).toMatch(
      /const \{ data: labReports = \[\], isLoading: reportsLoading, isError: reportsError, refetch: refetchReports \} = useQuery/
    );
  });

  it('the Medical tab renders a distinct error state (with retry) instead of the empty state on reportsError', () => {
    const medicalListIdx = SRC.indexOf('screenId="my-biology-medical"');
    expect(medicalListIdx).toBeGreaterThan(-1);
    const before = SRC.slice(Math.max(0, medicalListIdx - 1500), medicalListIdx);
    expect(before).toContain('{reportsError ? (');
    expect(before).toContain("t('screens.health.reportsLoadFailed')");
    expect(before).toContain('refetchReports()');
  });

  it('the Omics tab renders a distinct error state (with retry) instead of the empty state on reportsError', () => {
    const omicsListIdx = SRC.indexOf('screenId="my-biology-omics"');
    expect(omicsListIdx).toBeGreaterThan(-1);
    const before = SRC.slice(Math.max(0, omicsListIdx - 1500), omicsListIdx);
    expect(before).toContain('{reportsError ? (');
    expect(before).toContain("t('screens.health.reportsLoadFailed')");
    expect(before).toContain('refetchReports()');
  });
});
