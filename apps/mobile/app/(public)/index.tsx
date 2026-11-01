/**
 * VTID-05451 (public-legal) — `/` (PUBLIC.LANDING): the signed-out storefront
 * (web Index.tsx via ShareEntry, App.tsx:818). The N3 landing redirect
 * `app/index.tsx` stays as N3 left it (ledger native_only `/`).
 */
import { PublicLandingScreen } from '../../src/screens/public/PublicLandingScreen';

export default function PublicLanding() {
  return <PublicLandingScreen />;
}
