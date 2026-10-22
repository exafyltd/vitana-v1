/**
 * VTID-05297 (Native Wave 2, home-feed lane) — native twin of the web
 * `useEnrichmentCards` (`src/hooks/useEnrichmentCards.ts`, VTID-05085). Same
 * gateway contract (`GET /api/v1/enrichment-cards?screen=`, `POST
 * .../dismiss`), RE-IMPLEMENTED against the native gateway client
 * (`gatewayGet` / `getGateway`) — the web hook is class B (it imports
 * `@/integrations/supabase/client` and `@/lib/gateway-base`), so it is never
 * pulled from `@vitana/core`. The pure catalog helpers (`isVitanaCardType`,
 * `pickHomeServerCards`) come through the feed port.
 *
 * Home-scoped: the hook asks the gateway for the `home` screen and the caller
 * narrows the list with `pickHomeServerCards`. Dismiss is a server dismiss with
 * an optimistic removal across every cached screen of this member, rolled back
 * (and a toast shown) if the POST fails — mirroring the web hook.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { gatewayJson } from '../../../ports/core';
import { useAuth } from '../../../auth/AuthProvider';
import { notifyError } from '../../../ports/ui';
import { isVitanaCardType, type CardCategory, type VitanaCardType } from '../../../ports/feed';

export interface EnrichmentCard {
  card_type: VitanaCardType;
  category: CardCategory;
  priority: number;
  title: string;
  description: string;
  /** Numeric card params (boost cards); absent when the row has none. */
  params?: Record<string, number>;
}

/** Gateway `data` field → card param, for the numbers a boost card shows (web `CARD_DATA_PARAMS`). */
export const CARD_DATA_PARAMS: Readonly<Record<string, 'percentage' | 'count' | 'streak'>> = {
  completion_pct: 'percentage',
  unread_match_count: 'count',
  streak_days: 'streak',
};

function readParams(row: Record<string, unknown>): Record<string, number> | undefined {
  const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
  const out: Record<string, number> = {};
  for (const [field, param] of Object.entries(CARD_DATA_PARAMS)) {
    const value = data[field];
    if (typeof value === 'number' && Number.isFinite(value)) out[param] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface EnrichmentCardsPayload {
  cards: EnrichmentCard[];
  profile_completion_pct: number | null;
}

export const ENRICHMENT_CARDS_STALE_MS = 60 * 1000;

export const enrichmentCardsKey = (userId: string | undefined) => ['enrichment-cards', userId ?? null] as const;

/** Keep only rows the client knows how to render; the server order is the display order (web `parseEnrichmentCards`). */
export function parseEnrichmentCards(json: unknown): EnrichmentCardsPayload {
  const body = (json ?? {}) as { ok?: boolean; cards?: unknown; profile_completion_pct?: unknown };
  if (body.ok === false || !Array.isArray(body.cards)) throw new Error('enrichment-cards: bad payload');
  const cards = body.cards
    .filter((c): c is EnrichmentCard => !!c && typeof c === 'object' && isVitanaCardType((c as EnrichmentCard).card_type))
    .map((c) => {
      const params = readParams(c as unknown as Record<string, unknown>);
      return {
        card_type: c.card_type,
        category: c.category,
        priority: Number(c.priority) || 0,
        title: typeof c.title === 'string' ? c.title : '',
        description: typeof c.description === 'string' ? c.description : '',
        ...(params ? { params } : {}),
      };
    });
  const pct = typeof body.profile_completion_pct === 'number' ? body.profile_completion_pct : null;
  return { cards, profile_completion_pct: pct };
}

export async function fetchEnrichmentCards(screen: string): Promise<EnrichmentCardsPayload> {
  const json = await gatewayJson<unknown>(getGateway(), `/enrichment-cards?screen=${encodeURIComponent(screen)}`);
  return parseEnrichmentCards(json);
}

export async function postEnrichmentCardDismiss(cardType: VitanaCardType): Promise<{ dismissed_until: string | null }> {
  const json = await gatewayJson<{ ok?: boolean; dismissed_until?: string | null }>(getGateway(), '/enrichment-cards/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_type: cardType }),
  });
  if (json.ok === false) throw new Error('enrichment-cards/dismiss: not ok');
  return { dismissed_until: json.dismissed_until ?? null };
}

type Snapshot = Array<[readonly unknown[], EnrichmentCardsPayload | undefined]>;

/** Remove the card from every cached screen of this member; returns what to roll back to (web `removeEverywhere`). */
function removeEverywhere(qc: QueryClient, userId: string | undefined, cardType: VitanaCardType): Snapshot {
  const snapshot = qc.getQueriesData<EnrichmentCardsPayload>({ queryKey: enrichmentCardsKey(userId) });
  for (const [key, data] of snapshot) {
    if (!data) continue;
    qc.setQueryData<EnrichmentCardsPayload>(key, { ...data, cards: data.cards.filter((c) => c.card_type !== cardType) });
  }
  return snapshot;
}

/** Server dismiss with an optimistic update across every screen; rolls back on failure (web `useEnrichmentCardDismiss`). */
export function useEnrichmentCardDismiss() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (cardType: VitanaCardType) => postEnrichmentCardDismiss(cardType),
    onMutate: async (cardType) => {
      await qc.cancelQueries({ queryKey: enrichmentCardsKey(user?.id) });
      return { snapshot: removeEverywhere(qc, user?.id, cardType) };
    },
    onError: (_err, _cardType, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
      notifyError('toasts.vitanaCards.dismissFailed');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: enrichmentCardsKey(user?.id) });
    },
  });
  return (cardType: VitanaCardType) => mutation.mutate(cardType);
}

export interface UseEnrichmentCardsOptions {
  /** False while the screen is hidden: no requests then. Default true. */
  active?: boolean;
}

/**
 * Native twin of web `useEnrichmentCards`, fixed to the `home` screen. Returns
 * the cards (the caller narrows them with `pickHomeServerCards`), the profile
 * completion percentage, loading/error flags and `dismiss`.
 */
export function useEnrichmentCards(screen: string | null = 'home', { active = true }: UseEnrichmentCardsOptions = {}) {
  const { user } = useAuth();
  const dismiss = useEnrichmentCardDismiss();
  const query = useQuery({
    queryKey: [...enrichmentCardsKey(user?.id), screen],
    queryFn: () => fetchEnrichmentCards(screen as string),
    enabled: !!user && !!screen && active,
    staleTime: ENRICHMENT_CARDS_STALE_MS,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });
  return {
    cards: query.data?.cards ?? [],
    profileCompletionPct: query.data?.profile_completion_pct ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    dismiss,
  };
}
