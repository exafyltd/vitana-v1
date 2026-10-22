/**
 * VTID-05296 (N-W2 community-hub) — route /intents/mine. Ledger row
 * INTENTS.MINE. The web mobile branch redirects My Intents to the Find a
 * Partner "My Posts" view (`MyIntents.tsx`: `<Navigate to="/comm/find-partner?view=posts" replace />`),
 * so the native app — which is always the mobile surface — does the same.
 */
import { Redirect } from 'expo-router';

export default function MyIntentsRoute() {
  return <Redirect href={'/comm/find-partner?view=posts' as never} />;
}
