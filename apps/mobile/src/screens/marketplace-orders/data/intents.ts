/**
 * VTID-05511 — the marketplace's Intent Engine calls, twins of
 * `src/lib/intentApi.ts` `getIntentBoard` (:220-241), `listMyIntents`
 * (:117-126) and the IntentShareSheet POST (`/intents/:id/share`,
 * IntentShareSheet.tsx:107-121), over `communityFetch`. The board load of
 * `Marketplace.tsx` (:79-99) is reproduced exactly: "open" fetches
 * commercial_buy and commercial_sell (limit 30 each) in parallel and merges
 * them newest first; "mine" lists my open intents and keeps the commercial
 * kinds. Types come from the community lane's native twin of `intentApi`.
 */
import { useQuery } from '@tanstack/react-query';
import type { IntentKind, UserIntent } from '../../community/data/intents';
import { getGateway } from '../../../auth/gateway';
import { communityFetch, readJson } from './client';

export type { IntentKind, UserIntent };

export type MarketplaceView = 'open' | 'mine';

export const COMMERCIAL_KINDS: IntentKind[] = ['commercial_buy', 'commercial_sell'];

export interface BoardResponse {
  intents?: UserIntent[];
}

/** `getIntentBoard({ kind, limit })`. */
export async function getIntentBoard(filters: { kind?: IntentKind; limit?: number } = {}): Promise<BoardResponse> {
  const params = new URLSearchParams();
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  const res = await communityFetch(`/intent-board${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`Intent board failed (${res.status})`);
  return readJson<BoardResponse>(res);
}

/** `listMyIntents({ kind, status })`. */
export async function listMyIntents(filters: { kind?: IntentKind; status?: string } = {}): Promise<UserIntent[]> {
  const params = new URLSearchParams();
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  const res = await communityFetch(`/intents${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`List intents failed (${res.status})`);
  const data = await readJson<{ intents?: UserIntent[] }>(res);
  return data.intents ?? [];
}

/** The Marketplace `refresh()` for one view. */
export async function loadMarketplace(view: MarketplaceView): Promise<UserIntent[]> {
  if (view === 'open') {
    const [buy, sell] = await Promise.all([getIntentBoard({ kind: 'commercial_buy', limit: 30 }), getIntentBoard({ kind: 'commercial_sell', limit: 30 })]);
    return [...(buy.intents ?? []), ...(sell.intents ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  const all = await listMyIntents({ status: 'open' });
  return all.filter((it) => COMMERCIAL_KINDS.includes(it.intent_kind));
}

export function useMarketplace(view: MarketplaceView) {
  return useQuery({ queryKey: ['discover-marketplace', view], queryFn: () => loadMarketplace(view) });
}

export interface ShareResult {
  ok: boolean;
  error?: string;
  message?: string;
  matches_created?: number;
  recipients_already_shared?: number;
}

/**
 * IntentShareSheet `handleSendInApp`: POST `${GATEWAY_API_URL}/intents/:id/share`
 * with the Bearer token and a JSON body (a plain fetch on the web, no role header).
 */
export async function shareIntent(intentId: string, recipients: string[], note: string): Promise<ShareResult> {
  const res = await getGateway()(`/intents/${intentId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_vitana_ids: recipients, note: note.trim() || undefined, channel: 'in_app' }),
  });
  const data = await readJson<Omit<ShareResult, 'ok'>>(res);
  return { ok: res.ok, ...data };
}
