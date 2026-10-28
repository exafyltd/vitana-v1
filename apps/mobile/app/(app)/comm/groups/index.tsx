/**
 * VTID-05296 (N-W2 community-hub) — route /comm/groups (and ?tab=recommended
 * for the Discover tab). Covers ledger rows COMM.GROUPS + COMM.GROUPS_DISCOVER.
 */
import { useLocalSearchParams } from 'expo-router';
import { GroupsScreen } from '../../../../src/screens/community/GroupsScreen';

export default function GroupsRoute() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <GroupsScreen initialTab={tab === 'recommended' ? 'recommended' : 'my-groups'} />;
}
