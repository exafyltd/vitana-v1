/**
 * VTID-05296 (N-W2 community-hub) — route /comm/groups/:id. Ledger row
 * COMM.GROUP_DETAIL.
 */
import { useLocalSearchParams } from 'expo-router';
import { GroupDetailScreen } from '../../../../src/screens/community/GroupDetailScreen';

export default function GroupDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <GroupDetailScreen id={id} />;
}
