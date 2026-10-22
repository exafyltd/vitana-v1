/**
 * VTID-05296 (N-W2 community-hub) — route /intents/match/:id. Ledger row
 * INTENTS.MATCH_DETAIL. Deep-link target from push notifications.
 */
import { useLocalSearchParams } from 'expo-router';
import { IntentMatchDetailScreen } from '../../../../src/screens/community/IntentMatchDetailScreen';

export default function IntentMatchRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <IntentMatchDetailScreen id={id} />;
}
