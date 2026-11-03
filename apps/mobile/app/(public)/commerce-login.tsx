/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — `/commerce-login`, the
 * Commerce Portal's own sign-in card. A standalone page on the web (no
 * AuthGuard, no app chrome), so it lives in the public group.
 */
import { CommercePortalLoginScreen } from '../../src/screens/business/CommercePortalLoginScreen';

export default function CommerceLoginRoute() {
  return <CommercePortalLoginScreen />;
}
