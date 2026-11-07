/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the door the other
 * health lanes (`vitana-index-biology`, `health-plans-services`) use to reach
 * what this lane owns (plan decision 3): the native health-data module (the
 * RLS-scoped, read-only Vitana Index / lab report / supplement / summary
 * reads over the native Supabase client and auth), the Vitana Index value and
 * chip twins, the Index overlay and its open event, and the in-screen Health
 * Sync affordance. One owner; consumers import from here, never from
 * src/screens/health directly.
 */
export {
  useVitanaIndex,
  fetchVitanaIndex,
  toVitanaIndexState,
  weakestPillar,
  INDEX_SELECT_COLUMNS,
  VITANA_INDEX_QUERY_KEY,
  type VitanaIndexState,
  type VitanaIndexPillars,
  type VitanaPillarKey,
  type VitanaPillarSubscores,
  type UseVitanaIndexResult,
} from '../screens/health/data/vitana-index';
export {
  useLabReports,
  useUserSupplements,
  useProfileHealthSummary,
  normalizeHealthSummary,
  type LabReport,
  type UserSupplement,
  type ProfileHealthSummary,
} from '../screens/health/data/records';
export { VitanaIndexChip, VitanaIndexValue } from '../screens/health/MobileActionChips';
export { VitanaIndexSheet } from '../screens/health/VitanaIndexSheet';
export { openVitanaIndex, VITANA_INDEX_OPEN_EVENT } from '../screens/health/events';
export { HealthSyncAffordance, type HealthSyncAffordanceKind } from '../screens/health/sync/HealthSyncAffordance';
export { HealthReportUploadSheet } from '../screens/health/sheets';
