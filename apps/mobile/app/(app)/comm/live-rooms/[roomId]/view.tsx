/**
 * VTID-05532 (N-W2 live-rooms) — route /comm/live-rooms/:roomId/view. Ledger row
 * COMM.LIVE_ROOM_VIEWER. The Daily.co join is a G1 owner step; see the viewer screen.
 */
import { useLocalSearchParams } from 'expo-router';
import { LiveRoomViewerScreen } from '../../../../../src/screens/liverooms/LiveRoomViewerScreen';

export default function LiveRoomViewerRoute() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  return <LiveRoomViewerScreen roomId={roomId ?? ''} />;
}
