/**
 * MobileHealthMedicalTab.tsx — opening an uploaded report (VTID-04044).
 *
 * HealthReportUploadSheet stores the storage object key in
 * `lab_reports.file_path`. The mobile list opened `report.raw_file_ref`
 * (the c1-era column nothing writes for user uploads), so tapping a row on
 * the phone silently did nothing while the desktop MyBiology page — which
 * reads `file_path` — worked. Both list surfaces must open the same column,
 * with `raw_file_ref` kept only as the fallback for legacy/partner rows.
 *
 * Same source-level pinning pattern as the sibling error-handling test —
 * this component has no render harness.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'MobileHealthMedicalTab.tsx'), 'utf8');
const MY_BIOLOGY = readFileSync(
  join(__dirname, '..', '..', '..', 'pages', 'health', 'MyBiology.tsx'),
  'utf8',
);

describe('MobileHealthMedicalTab — report row opens the uploaded file', () => {
  it('passes file_path (what the upload sheet writes) to handleViewReport, falling back to raw_file_ref', () => {
    expect(SRC).toContain('handleViewReport(report.file_path ?? report.raw_file_ref)');
    expect(SRC).not.toContain('handleViewReport(report.raw_file_ref)');
  });

  it('signs the URL against the same bucket the upload sheet writes to', () => {
    expect(SRC).toContain(".from('health-reports')");
    expect(SRC).toContain('createSignedUrl(filePath, 3600)');
  });

  it('agrees with the desktop MyBiology page on the column', () => {
    expect(MY_BIOLOGY).toContain('handleViewReport(report.file_path)');
  });
});
