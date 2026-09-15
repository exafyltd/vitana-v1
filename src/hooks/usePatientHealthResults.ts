/**
 * Commerce Partner Onboarding, Phase 3 (VTID-03936) — a patient's own
 * aggregated health results, backed by the gateway's
 * `GET /api/v1/patient/health-results` (vitana-platform VTID-03939).
 *
 * Deliberately typed (not `any[]`) — the sibling `/health/my-biology`
 * page's own bug was exactly an untyped response letting a column-name
 * mismatch ship unnoticed.
 */
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-api';

export interface PatientBiomarker {
  id: string;
  biomarker_code: string | null;
  name: string | null;
  value: number | null;
  unit: string | null;
  ref_range_low: number | null;
  ref_range_high: number | null;
  status: string | null;
  measured_at: string;
}

export interface PatientHealthResultOrg {
  display_name: string | null;
  self_registered_name: string | null;
  professional_user_id: string | null;
}

export interface PatientHealthResult {
  id: string;
  report_date: string | null;
  source: string | null;
  created_at: string;
  partner_result_id: string | null;
  org: PatientHealthResultOrg | null;
  biomarkers: PatientBiomarker[];
}

export function usePatientHealthResults() {
  return useQuery({
    queryKey: ['patient-health-results'],
    queryFn: async () => {
      const json = await adminFetch('/api/v1/patient/health-results');
      return json.results as PatientHealthResult[];
    },
  });
}
