/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — `/profile/subscriptions`.
 * The web `ProfileSubscriptionsRouter` renders the `MobileSubscriptions`
 * storefront on phones (desktop redirects to /wallet/subscriptions); native is
 * the phone context, so this route renders the storefront.
 */
import { ProfileSubscriptionsScreen } from '../../../src/screens/wallet-subscriptions/ProfileSubscriptionsScreen';

export default function ProfileSubscriptionsRoute() {
  return <ProfileSubscriptionsScreen />;
}
