/**
 * `/` — PUBLIC.LANDING (web src/App.tsx:818). VTID-05650 mounts the storefront
 * of VTID-05451 (`PublicLandingScreen`) here: signed out → the five portal
 * cards; signed in → `/home` (useSmartRouting.tsx:102-110, done by the screen
 * itself); a resolving session → the loader.
 */
import { PublicLandingScreen } from '../src/screens/public/PublicLandingScreen';

export default function Landing() {
  return <PublicLandingScreen />;
}
