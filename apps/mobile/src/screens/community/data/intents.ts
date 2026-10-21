/**
 * VTID-05296 (N-W2 community-hub) — native twin of the web Intent Engine
 * client (`src/lib/intentApi.ts`) and `useRealMatches.ts`. The gateway routes
 * are called with bare paths (the native gateway fetch prepends `/api/v1`);
 * the shapes mirror the web types 1:1. Reads only.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { gatewayJson } from '../../../ports/core';

export type IntentKind =
  | 'commercial_buy'
  | 'commercial_sell'
  | 'activity_seek'
  | 'partner_seek'
  | 'social_seek'
  | 'mutual_aid';

export interface UserIntent {
  intent_id: string;
  requester_user_id: string;
  requester_vitana_id: string | null;
  tenant_id: string;
  intent_kind: IntentKind;
  category: string | null;
  title: string;
  scope: string;
  kind_payload: Record<string, unknown>;
  visibility: 'public' | 'tenant' | 'private' | 'mutual_reveal';
  compass_alignment_at_post: string | null;
  status: 'draft' | 'open' | 'matched' | 'engaged' | 'fulfilled' | 'closed' | 'cancelled';
  match_count: number;
  created_at: string;
  updated_at: string;
  cover_url?: string | null;
}

export interface IntentMatch {
  match_id: string;
  intent_a_id: string;
  intent_b_id: string | null;
  vitana_id_a: string | null;
  vitana_id_b: string | null;
  kind_pairing: string;
  score: number;
  match_reasons: Record<string, unknown>;
  compass_aligned: boolean;
  state: string;
  created_at: string;
  redacted?: boolean;
  partner_display_name?: string | null;
  partner_avatar_url?: string | null;
  partner_intent_title?: string | null;
  partner_intent_scope?: string | null;
  partner_intent_kind?: IntentKind | string | null;
}

export interface BoardResponse {
  compass: string | null;
  kinds_shown: IntentKind[];
  surface?: string;
  intents: UserIntent[];
}

const bareQuery = (params: URLSearchParams) => {
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

/**
 * The board kind filters (web `IntentBoard.KIND_FILTERS`): the intent kinds
 * plus `learning_seek` / `mentor_seek` (which the gateway forwards as a `kind`),
 * the client-side `dance` meta-tab and `all`. A string, because the two seek
 * kinds are not part of the posted `IntentKind` union.
 */
export type BoardFilter = IntentKind | 'learning_seek' | 'mentor_seek' | 'all' | 'dance';

/** Mirrors `getIntentBoard`. `filter === 'dance'` is client-side (web IntentBoard.tsx). */
export function useIntentBoard(filter: BoardFilter) {
  return useQuery({
    queryKey: ['intent-board', filter],
    queryFn: async (): Promise<BoardResponse> => {
      const params = new URLSearchParams();
      if (filter !== 'all' && filter !== 'dance') params.set('kind', filter);
      return gatewayJson<BoardResponse>(getGateway(), `/intent-board${bareQuery(params)}`);
    },
  });
}

/** Mirrors `listMyIntents({ status: 'open', kind })`. */
export function useMyIntents(tab: IntentKind | 'all') {
  return useQuery({
    queryKey: ['my-intents', tab],
    queryFn: async (): Promise<UserIntent[]> => {
      const params = new URLSearchParams();
      params.set('status', 'open');
      if (tab !== 'all') params.set('kind', tab);
      const data = await gatewayJson<{ intents?: UserIntent[] }>(getGateway(), `/intents${bareQuery(params)}`);
      return data.intents ?? [];
    },
  });
}

/** The composer's kind options (web `IntentComposer.KIND_OPTIONS`). */
export const INTENT_COMPOSER_KINDS: IntentKind[] = [
  'commercial_buy',
  'commercial_sell',
  'activity_seek',
  'social_seek',
  'mutual_aid',
  'partner_seek',
];

export interface PostIntentInput {
  intent_kind: IntentKind;
  title: string;
  scope: string;
  kind_payload?: Record<string, unknown>;
}

/**
 * Mirrors `postIntent` in `src/lib/intentApi.ts` — `POST /intents`. The native
 * composer invalidates the board + my-intents + matches caches on success so
 * the just-posted wish shows up, exactly like the web `onPosted` → refresh.
 */
export function usePostIntent(onPosted?: (intentId: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostIntentInput): Promise<{ intent_id: string }> => {
      const data = await gatewayJson<{ intent_id: string; intent?: UserIntent }>(getGateway(), '/intents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return { intent_id: data.intent_id ?? data.intent?.intent_id ?? '' };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['intent-board'] });
      queryClient.invalidateQueries({ queryKey: ['my-intents'] });
      queryClient.invalidateQueries({ queryKey: ['find-partner-matches'] });
      onPosted?.(result.intent_id);
    },
  });
}

/** Mirrors `getIntent` + `getIntentMatches` for the match-detail screen. */
export function useIntentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['intent-detail', id],
    enabled: !!id,
    queryFn: async (): Promise<{ intent: UserIntent; matches: IntentMatch[] }> => {
      if (!id) throw new Error('missing intent id');
      const gw = getGateway();
      const intentData = await gatewayJson<{ intent: UserIntent }>(gw, `/intents/${id}`);
      const matchesData = await gatewayJson<{ matches?: IntentMatch[] }>(gw, `/intents/${id}/matches?limit=10`);
      return { intent: intentData.intent, matches: matchesData.matches ?? [] };
    },
  });
}
