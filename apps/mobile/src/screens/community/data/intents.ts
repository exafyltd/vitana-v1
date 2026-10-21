/**
 * VTID-05296 (N-W2 community-hub) — native twin of the web Intent Engine
 * client (`src/lib/intentApi.ts`) and `useRealMatches.ts`. The gateway routes
 * are called with bare paths (the native gateway fetch prepends `/api/v1`);
 * the shapes mirror the web types 1:1. Reads only.
 */
import { useQuery } from '@tanstack/react-query';
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

/** Mirrors `getIntentBoard`. `filter === 'dance'` is client-side (web IntentBoard.tsx). */
export function useIntentBoard(filter: IntentKind | 'all' | 'dance') {
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
