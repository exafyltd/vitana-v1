/**
 * VTID-05296 (N-W2 community-hub) — route /comm/members. Ledger rows
 * COMM.MEMBERS + OVERLAY.PROFILE_PREVIEW (the in-screen profile preview sheet).
 */
import { MembersScreen } from '../../../src/screens/community/MembersScreen';

export default function MembersRoute() {
  return <MembersScreen />;
}
