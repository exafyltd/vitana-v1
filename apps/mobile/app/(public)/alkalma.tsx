/**
 * VTID-05186 (N3, plan change 16) — `/alkalma` (AUTH.ALKALMA_PORTAL).
 * VTID-05449 — the generic community portal with the fixed slug, like the web
 * (App.tsx:878 `<TenantPortal slug="alkalma" />`).
 */
import { TenantPortalScreen } from '../../src/screens/auth/TenantPortalScreen';

export default function AlkalmaPortal() {
  return <TenantPortalScreen slug="alkalma" />;
}
