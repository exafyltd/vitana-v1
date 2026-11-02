/** VTID-05430 (Native Wave 2, public-profile lane) — `/profile/:id` (legacy exclusion), public redirect to the canonical `/u/…` profile. */
import { LegacyProfileRedirectScreen } from '../../../src/screens/public-profile/LegacyProfileRedirectScreen';

export default function LegacyProfileRoute() {
  return <LegacyProfileRedirectScreen />;
}
