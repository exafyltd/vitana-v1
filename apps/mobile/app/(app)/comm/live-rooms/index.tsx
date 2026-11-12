/**
 * VTID-05532 (N-W2 live-rooms) — route /comm/live-rooms, and ?tab=all|live|scheduled|past for the
 * tab variants. Covers ledger rows COMM.LIVE_ROOMS, COMM.LIVE_ROOMS_ALL, COMM.LIVE_ROOMS_LIVE,
 * COMM.LIVE_ROOMS_PAST and COMM.LIVE_ROOMS_SCHEDULED.
 */
import { useLocalSearchParams } from 'expo-router';
import { LiveRoomsScreen, type LiveRoomsTab } from '../../../../src/screens/liverooms/LiveRoomsScreen';

const TABS: readonly LiveRoomsTab[] = ['all', 'live', 'scheduled', 'past'];

export default function LiveRoomsRoute() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <LiveRoomsScreen initialTab={TABS.find((t) => t === tab) ?? 'all'} />;
}
