/**
 * Health.tsx — the uploaded-report list never refreshed after a successful
 * upload (VTID-04047).
 *
 * Reported live: the upload sheet's "Report uploaded" success toast fired
 * (confirmed via a live read-only DB check: the row landed in lab_reports
 * with the correct user_id/file_path, per VTID-04044's RLS fix), but the
 * Medical tab still rendered "No Health Reports Yet" right underneath it.
 *
 * Root cause: both places this page renders <HealthReportUploadSheet>
 * omitted the onUploadComplete prop, so the sheet's
 * `onUploadComplete?.()` call was a no-op — nothing ever invalidated or
 * refetched MobileHealthMedicalTab's `['lab-reports']` query, which only
 * fetches once on mount. The desktop MyBiology.tsx page already wires this
 * correctly (`onUploadComplete={() => refetchReports()}`); this page,
 * which is what mobile users actually see, did not.
 *
 * Fixed: a shared `queryClient` invalidates the exact `['lab-reports']`
 * key MobileHealthMedicalTab uses, at both render sites (the early mobile
 * return and the main return share one component scope).
 *
 * Same source-level pinning pattern as MobileHealthMedicalTab's own
 * sibling test — this page has no render harness.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'Health.tsx'), 'utf8');

describe('Health.tsx — upload sheet refreshes the report list on completion', () => {
  it('imports useQueryClient from react-query', () => {
    expect(SRC).toContain('import { useQueryClient } from "@tanstack/react-query";');
  });

  it('declares a queryClient instance in the component', () => {
    expect(SRC).toMatch(/const queryClient = useQueryClient\(\);/);
  });

  it('passes onUploadComplete at every <HealthReportUploadSheet> render site, invalidating the exact key MobileHealthMedicalTab reads', () => {
    const sheetBlocks = SRC.split('<HealthReportUploadSheet').slice(1);
    expect(sheetBlocks.length).toBeGreaterThanOrEqual(2);
    for (const block of sheetBlocks) {
      const propsChunk = block.slice(0, block.indexOf('/>') + 2);
      expect(propsChunk).toContain('onUploadComplete=');
      expect(propsChunk).toMatch(
        /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['lab-reports'\]\s*\}\)/,
      );
    }
  });
});
