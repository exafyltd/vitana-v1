/**
 * VTID-05296 (N-W2 community-hub) — legacy route /comm/my-groups/:id (ledger
 * row /comm/my-groups/:id, an exclusion alias). Renders the same group detail
 * as /comm/groups/:id, matching the web alias.
 */
import { useLocalSearchParams } from 'expo-router';
import { GroupDetailScreen } from '../../../../src/screens/community/GroupDetailScreen';

export default function MyGroupDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <GroupDetailScreen id={id} />;
}
