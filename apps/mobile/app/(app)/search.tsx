/**
 * VTID-05296 (N-W2 community-hub) — route /search (and ?q= for a deep-linked
 * query). Ledger row SEARCH.OVERVIEW.
 */
import { useLocalSearchParams } from 'expo-router';
import { SearchScreen } from '../../src/screens/community/SearchScreen';

export default function SearchRoute() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return <SearchScreen initialQuery={typeof q === 'string' ? q : ''} />;
}
