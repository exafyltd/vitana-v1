/**
 * VTID-05296 (N-W2 community-hub) — route /comm/find-partner (and the ?view=
 * sub-views matches | board | posts | members). Covers ledger rows
 * COMM.FIND_PARTNER + COMM.FIND_PARTNER_BOARD + _MATCHES + _POSTS.
 */
import { useLocalSearchParams } from 'expo-router';
import { FindPartnerScreen, type FindPartnerView } from '../../../src/screens/community/FindPartnerScreen';

const VIEWS: readonly FindPartnerView[] = ['matches', 'board', 'posts', 'members'];

export default function FindPartnerRoute() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const initialView = (VIEWS as readonly string[]).includes(view ?? '') ? (view as FindPartnerView) : 'matches';
  return <FindPartnerScreen initialView={initialView} />;
}
