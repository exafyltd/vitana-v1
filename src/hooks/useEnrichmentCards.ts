/**
 * VTID-05085 — the member's Unified Card System state from the gateway.
 *
 *   GET  /api/v1/enrichment-cards?screen=<screen>
 *        → { ok, cards: [{ card_type, category, priority, title, description }], profile_completion_pct }
 *   POST /api/v1/enrichment-cards/dismiss  { card_type } → { ok, dismissed_until }
 *
 * The server decides which enrichment/boost cards are still open (completion
 * is derived from the source tables) and which are cooling down after a
 * dismiss (7 days). Titles/descriptions arrive already in the member's locale.
 *
 * Follows useDidYouKnowTip: GATEWAY_API_URL + the Supabase bearer token.
 * A failed GET throws, so callers see `isError` and render nothing — never a
 * silently empty list that looks like "everything is done".
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { GATEWAY_API_URL } from '@/lib/gateway-base';
import { notifyError } from '@/lib/i18n-toast';
import { isVitanaCardType, type CardCategory, type VitanaCardType } from '@/components/vitana/vitana-card-catalog';

export interface EnrichmentCard {
  card_type: VitanaCardType;
  category: CardCategory;
  priority: number;
  title: string;
  description: string;
}

export interface EnrichmentCardsPayload {
  cards: EnrichmentCard[];
  profile_completion_pct: number | null;
}

/** All enrichment-card queries of one member share this prefix (a dismiss touches every screen). */
/**
 * How long a card list counts as fresh. Short on purpose: a card is completed
 * outside this hook (a profile save, a first post, an OAuth round-trip), so a
 * stale list is re-read on window focus, on mount and when a kept-alive screen
 * becomes active again. Flows we own also invalidate it right away
 * (useInvalidateEnrichmentCards).
 */
export const ENRICHMENT_CARDS_STALE_MS = 60 * 1000;

export const enrichmentCardsKey = (userId: string | undefined) => ['enrichment-cards', userId ?? null] as const;

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('enrichment-cards: no session');
  return token;
}

/** Keep only rows the client knows how to render; the server order is the display order. */
export function parseEnrichmentCards(json: unknown): EnrichmentCardsPayload {
  const body = (json ?? {}) as { ok?: boolean; cards?: unknown; profile_completion_pct?: unknown };
  if (body.ok === false || !Array.isArray(body.cards)) throw new Error('enrichment-cards: bad payload');
  const cards = body.cards
    .filter((c): c is EnrichmentCard => !!c && typeof c === 'object' && isVitanaCardType((c as EnrichmentCard).card_type))
    .map((c) => ({
      card_type: c.card_type,
      category: c.category,
      priority: Number(c.priority) || 0,
      title: typeof c.title === 'string' ? c.title : '',
      description: typeof c.description === 'string' ? c.description : '',
    }));
  const pct = typeof body.profile_completion_pct === 'number' ? body.profile_completion_pct : null;
  return { cards, profile_completion_pct: pct };
}

export async function fetchEnrichmentCards(screen: string): Promise<EnrichmentCardsPayload> {
  const token = await bearer();
  const res = await fetch(`${GATEWAY_API_URL}/enrichment-cards?screen=${encodeURIComponent(screen)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`enrichment-cards: ${res.status}`);
  return parseEnrichmentCards(await res.json());
}

export async function postEnrichmentCardDismiss(cardType: VitanaCardType): Promise<{ dismissed_until: string | null }> {
  const token = await bearer();
  const res = await fetch(`${GATEWAY_API_URL}/enrichment-cards/dismiss`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_type: cardType }),
  });
  if (!res.ok) throw new Error(`enrichment-cards/dismiss: ${res.status}`);
  const json = (await res.json()) as { ok?: boolean; dismissed_until?: string | null };
  if (json.ok === false) throw new Error('enrichment-cards/dismiss: not ok');
  return { dismissed_until: json.dismissed_until ?? null };
}

type Snapshot = Array<[readonly unknown[], EnrichmentCardsPayload | undefined]>;

/** Remove the card from every cached screen of this member; returns what to roll back to. */
function removeEverywhere(qc: QueryClient, userId: string | undefined, cardType: VitanaCardType): Snapshot {
  const snapshot = qc.getQueriesData<EnrichmentCardsPayload>({ queryKey: enrichmentCardsKey(userId) });
  for (const [key, data] of snapshot) {
    if (!data) continue;
    qc.setQueryData<EnrichmentCardsPayload>(key, { ...data, cards: data.cards.filter((c) => c.card_type !== cardType) });
  }
  return snapshot;
}

/**
 * Server dismiss with an optimistic update: the card disappears on every
 * screen at once, comes back (and a toast explains) if the POST fails.
 */
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

/** Re-read the member's card state (after an action that completes a card). */
export function useInvalidateEnrichmentCards() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: enrichmentCardsKey(user?.id) });
}

export interface UseEnrichmentCardsOptions {
  /**
   * False while a kept-alive screen is hidden (Home): no requests then, and
   * a stale list is re-read the moment it is shown again. Default true.
   */
  active?: boolean;
}

export function useEnrichmentCards(screen: string | null, { active = true }: UseEnrichmentCardsOptions = {}) {
  const { user } = useAuth();
  const dismiss = useEnrichmentCardDismiss();
  const query = useQuery({
    queryKey: [...enrichmentCardsKey(user?.id), screen],
    queryFn: () => fetchEnrichmentCards(screen as string),
    enabled: !!user && !!screen && active,
    staleTime: ENRICHMENT_CARDS_STALE_MS,
    // Overrides the app default (main.tsx: false) — see ENRICHMENT_CARDS_STALE_MS.
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
