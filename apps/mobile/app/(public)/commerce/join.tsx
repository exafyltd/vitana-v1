/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — `/commerce/join`, the
 * supplier's front door. Public (App.tsx has no AuthGuard on it), so it lives
 * in the public group like the other sign-in routes.
 */
import { CommerceJoinScreen } from '../../../src/screens/business/CommerceJoinScreen';

export default function CommerceJoinRoute() {
  return <CommerceJoinScreen />;
}
