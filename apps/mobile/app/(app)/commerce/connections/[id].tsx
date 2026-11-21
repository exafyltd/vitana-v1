/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — `/commerce/connections/:id`
 * (src/pages/CommerceConnectionRedirect.tsx): old links keep working; they
 * land on the portal with that connection's drawer open.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CommerceConnectionRedirectRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const one = Array.isArray(id) ? id[0] : id;
  return <Redirect href={(one ? `/commerce?connection=${encodeURIComponent(one)}` : '/commerce') as never} />;
}
