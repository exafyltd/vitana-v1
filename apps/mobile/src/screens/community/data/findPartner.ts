/**
 * VTID-05296 (N-W2 community-hub) — native twin of the Find a Match matches
 * fan-out (`getFindPartnerMatches` in `src/lib/intentApi.ts`): matches across
 * the member's open intents, merged and sorted by score. Reads only, bare
 * gateway paths.
 */
import { useQuery } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { gatewayJson } from '../../../ports/core';
import type { IntentMatch, UserIntent } from './intents';

export interface FindPartnerMatch extends IntentMatch {
  source_intent_id: string;
  source_category: string | null;
  vertical: 'dance' | 'fitness' | null;
}

const FIND_PARTNER_MAX_SOURCE_INTENTS = 20;

function verticalFromCategory(cat: string | null): 'dance' | 'fitness' | null {
  if (!cat) return null;
  if (cat.startsWith('dance.')) return 'dance';
  if (cat.startsWith('fitness.')) return 'fitness';
  return null;
}

/** Mirrors `getFindPartnerMatches` — one `/matches` call per open source intent. */
export function useFindPartnerMatches(perIntentLimit = 5) {
  return useQuery({
    queryKey: ['find-partner-matches', perIntentLimit],
    queryFn: async (): Promise<FindPartnerMatch[]> => {
      const gw = getGateway();
      const mineData = await gatewayJson<{ intents?: UserIntent[] }>(gw, '/intents?status=open');
      const mine = mineData.intents ?? [];
      if (mine.length === 0) return [];
      const sources = mine.slice(0, FIND_PARTNER_MAX_SOURCE_INTENTS);

      const matches = await Promise.all(
        sources.map(async (it) => {
          try {
            const rows = await gatewayJson<{ matches?: IntentMatch[] }>(gw, `/intents/${it.intent_id}/matches?limit=${perIntentLimit}`);
            return (rows.matches ?? []).map(
              (m): FindPartnerMatch => ({
                ...m,
                source_intent_id: it.intent_id,
                source_category: it.category,
                vertical: verticalFromCategory(it.category),
              }),
            );
          } catch {
            return [] as FindPartnerMatch[];
          }
        }),
      );

      return matches.flat().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    },
  });
}
