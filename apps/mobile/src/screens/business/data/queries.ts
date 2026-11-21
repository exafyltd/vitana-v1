/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — native twins of the web Business Hub
 * data hooks, class B (Supabase / gateway coupled), re-implemented against the native clients:
 * `useResellerProfile`, `useUnifiedEarnings` + `useResellerSales`, `useBusinessPackages` (read),
 * `useOrganizerEvents`, the reseller inventory and campaign reads, the VAEA hooks (`useVaea.ts`),
 * and the intent reads of the opportunities and listings pages. The same tables, columns and filters;
 * reads only (no member write happens in this lane's screens apart from the intent-match
 * interest/decline calls the web opportunity card makes).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import { useTenant } from '../../../identity/TenantProvider';
import { GatewayError, gatewayJson } from '../../../ports/core';
import {
  computeUnifiedEarnings,
  EMPTY_EARNINGS,
  EMPTY_RESELLER_SALES,
  summariseDirectSales,
  summariseResellerSales,
  type AttributionRow,
  type PayoutRow,
  type ResellerSalesSummary,
  type TicketPurchaseRow,
  type UnifiedEarnings,
  type WalletTxRow,
} from '../earnings';
import type { IntentMatch } from './types';
import type { UserIntent } from '../../community/data/intents';

/* eslint-disable @typescript-eslint/no-explicit-any */
type DbResult = { data: any; error: { message: string; code?: string } | null };
interface DbQuery extends PromiseLike<DbResult> {
  select(columns: string): DbQuery;
  eq(column: string, value: unknown): DbQuery;
  in(column: string, values: unknown[]): DbQuery;
  gte(column: string, value: unknown): DbQuery;
  order(column: string, options?: { ascending?: boolean }): DbQuery;
  limit(count: number): DbQuery;
  maybeSingle(): PromiseLike<DbResult>;
}
interface DbClient {
  from(table: string): DbQuery;
}
const db = (): DbClient => getSupabase() as unknown as DbClient;

async function rows<T>(q: PromiseLike<DbResult>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

/* ------------------------------------------------------------------ reseller */

export interface ResellerProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  reseller_code: string;
  commission_rate: number;
  status: string;
}

/** Web `useResellerProfile`: the active reseller profile of the member in the active tenant. */
export function useResellerProfile() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ['reseller-profile', activeTenantId, user?.id],
    queryFn: async (): Promise<ResellerProfile | null> => {
      const { data, error } = await db()
        .from('reseller_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .eq('tenant_id', activeTenantId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as ResellerProfile | null;
    },
    enabled: !!activeTenantId && !!user?.id,
  });
}

/** Web `useIsReseller`: an active reseller profile makes the member a reseller. */
export function useIsReseller() {
  const q = useResellerProfile();
  const profile = q.data;
  return { isReseller: !!profile && profile.status === 'active', isLoading: q.isPending, resellerProfile: profile ?? null };
}

/** Web `useResellerSales`: attributions and payouts of the reseller profile. */
export function useResellerSales() {
  const { data: profile } = useResellerProfile();
  return useQuery({
    queryKey: ['reseller-attributed-sales', profile?.id],
    queryFn: async (): Promise<ResellerSalesSummary> => {
      if (!profile?.id) return EMPTY_RESELLER_SALES;
      const attributions = await rows<AttributionRow>(
        db()
          .from('reseller_attributions')
          .select('id, event_id, sale_amount, commission_amount, commission_rate, created_at, ticket_purchase_id, payout_id')
          .eq('reseller_id', profile.id)
          .order('created_at', { ascending: false }),
      );
      const payouts = await rows<PayoutRow>(db().from('reseller_payouts').select('*').eq('reseller_profile_id', profile.id).order('created_at', { ascending: false }));
      const quantities = new Map<string, number>();
      if (attributions.length > 0) {
        const purchases = await rows<{ id: string; quantity: number | null }>(
          db()
            .from('event_ticket_purchases')
            .select('id, quantity')
            .in('id', attributions.map((a) => a.ticket_purchase_id)),
        );
        for (const p of purchases) quantities.set(p.id, p.quantity || 1);
      }
      return summariseResellerSales(attributions, payouts, quantities);
    },
    enabled: !!profile?.id,
  });
}

/** Web `useUnifiedEarnings`: wallet rows + the member's own event sales + reseller commissions. */
export function useUnifiedEarnings(): { earnings: UnifiedEarnings; isLoading: boolean } {
  const { user } = useAuth();
  const reseller = useResellerSales();
  const wallet = useQuery({
    queryKey: ['unified-earnings-wallet', user?.id],
    queryFn: () =>
      rows<WalletTxRow>(
        db()
          .from('wallet_transactions')
          .select('*')
          .eq('to_user_id', user!.id)
          .in('transaction_type', ['reseller_commission', 'ticket_sale', 'purchase'])
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20),
      ),
    enabled: !!user?.id,
  });
  const direct = useQuery({
    queryKey: ['unified-earnings-direct-sales', user?.id],
    queryFn: async () => {
      const events = await rows<{ id: string }>(db().from('global_community_events').select('id').eq('created_by', user!.id));
      if (events.length === 0) return { gross: 0, tickets: 0, lastMonth: 0 };
      const purchases = await rows<TicketPurchaseRow>(
        db()
          .from('event_ticket_purchases')
          .select('total_amount, quantity, created_at')
          .in('event_id', events.map((e) => e.id))
          .eq('status', 'confirmed'),
      );
      return summariseDirectSales(purchases);
    },
    enabled: !!user?.id,
  });
  const isLoading = wallet.isPending || direct.isPending;
  if (!wallet.data && !direct.data && !reseller.data) return { earnings: EMPTY_EARNINGS, isLoading };
  return {
    earnings: computeUnifiedEarnings({
      wallet: wallet.data ?? [],
      direct: direct.data ?? { gross: 0, tickets: 0, lastMonth: 0 },
      reseller: reseller.data ?? EMPTY_RESELLER_SALES,
    }),
    isLoading,
  };
}

/* ------------------------------------------------------------------ services side */

export interface PackageRow {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  original_price_cents: number | null;
  package_type: 'bundle' | 'subscription' | 'program';
  status: 'draft' | 'published' | 'archived';
  items?: Array<{ quantity: number }> | null;
}

/** Web `useBusinessPackages` read: the member's packages in the active tenant. */
export function useBusinessPackages() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ['business-packages', user?.id, activeTenantId],
    queryFn: () =>
      rows<PackageRow>(
        db()
          .from('business_packages')
          .select('*, items:package_items(*)')
          .eq('creator_id', user!.id)
          .eq('tenant_id', activeTenantId)
          .order('created_at', { ascending: false }),
      ),
    enabled: !!user?.id && !!activeTenantId,
  });
}

export interface OrganizerEvent {
  id: string;
  title: string;
  image_url: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  ticketsSold: number;
  totalRevenue: number;
  checkedInCount: number;
  totalCapacity: number;
  buyerCount: number;
}

/** Web `useOrganizerEvents`: own events with ticket sales; only events with tickets are listed. */
export function useOrganizerEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['organizer-events', user?.id],
    queryFn: async (): Promise<OrganizerEvent[]> => {
      const events = await rows<Pick<OrganizerEvent, 'id' | 'title' | 'image_url' | 'start_time' | 'end_time' | 'location'>>(
        db().from('global_community_events').select('id, title, image_url, start_time, end_time, location').eq('created_by', user!.id).order('start_time', { ascending: false }),
      );
      const withSales = await Promise.all(
        events.map(async (event): Promise<OrganizerEvent> => {
          const types = await rows<{ quantity_available: number | null }>(db().from('event_ticket_types').select('quantity_available').eq('event_id', event.id).eq('is_active', true)).catch(() => []);
          const purchases = await rows<{ quantity: number | null; total_amount: number | null; buyer_id: string; checked_in_at: string | null }>(
            db().from('event_ticket_purchases').select('quantity, total_amount, buyer_id, checked_in_at').eq('event_id', event.id).eq('status', 'completed'),
          ).catch(() => []);
          return {
            ...event,
            ticketsSold: purchases.reduce((s, p) => s + (p.quantity || 0), 0),
            totalRevenue: purchases.reduce((s, p) => s + (p.total_amount || 0), 0),
            checkedInCount: purchases.filter((p) => p.checked_in_at !== null).length,
            totalCapacity: types.reduce((s, t) => s + (t.quantity_available || 0), 0),
            buyerCount: new Set(purchases.map((p) => p.buyer_id)).size,
          };
        }),
      );
      return withSales.filter((e) => e.totalCapacity > 0 || e.ticketsSold > 0);
    },
    enabled: !!user?.id,
  });
}

/* ------------------------------------------------------------------ sales side */

export interface ResellableEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  image_url: string | null;
  created_by: string;
  resale_scope: string | null;
  default_reseller_commission_rate: number | null;
  metadata: Record<string, unknown> | null;
}

const RESELLABLE_COLUMNS = 'id, title, start_time, end_time, location, image_url, created_by, resellable, resale_scope, default_reseller_commission_rate, metadata';

/** Web `ResellerAvailableEventsTab` query: public + tenant resellable future events of other organisers. */
export function useResellableEvents() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { data: profile } = useResellerProfile();
  return useQuery({
    queryKey: ['reseller-available-events', user?.id, activeTenantId],
    queryFn: async (): Promise<ResellableEvent[]> => {
      const nowIso = new Date().toISOString();
      const pub = await rows<ResellableEvent>(
        db().from('global_community_events').select(RESELLABLE_COLUMNS).eq('resellable', true).eq('resale_scope', 'public').gte('start_time', nowIso).order('start_time', { ascending: true }),
      );
      let tenant: ResellableEvent[] = [];
      if (activeTenantId) {
        tenant = await rows<ResellableEvent>(
          db().from('global_community_events').select(RESELLABLE_COLUMNS).eq('resellable', true).eq('resale_scope', 'tenant').eq('tenant_id', activeTenantId).gte('start_time', nowIso).order('start_time', { ascending: true }),
        ).catch(() => []);
      }
      return [...pub, ...tenant].filter((e) => e.created_by !== user!.id).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    },
    enabled: !!user?.id && !!profile,
  });
}

export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  metadata: { event_id?: string } | null;
}

/** Web `ResellerCampaignsTab` reads: the member's campaigns and the events they promote. */
export function useCampaigns() {
  const { user } = useAuth();
  const campaigns = useQuery({
    queryKey: ['reseller-campaigns', user?.id],
    queryFn: () => rows<CampaignRow>(db().from('campaigns').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })),
    enabled: !!user?.id,
  });
  const eventIds = (campaigns.data ?? []).map((c) => c.metadata?.event_id).filter((id): id is string => !!id);
  const linked = useQuery({
    queryKey: ['campaign-linked-events', eventIds],
    queryFn: () => rows<{ id: string; title: string; image_url: string | null }>(db().from('global_community_events').select('id, title, image_url').in('id', eventIds)),
    enabled: eventIds.length > 0,
  });
  return { campaigns, linkedEvents: linked.data ?? [] };
}

/* ------------------------------------------------------------------ VAEA (autopilot referrals) */

export interface VaeaDraft {
  id: string;
  reply_body: string;
  match_reason: string | null;
  match_score: number | null;
  status: string;
}

export interface VaeaCatalogItem {
  id: string;
  tier: 'own' | 'vetted_partner' | 'affiliate_network';
  category: string;
  title: string;
  personal_note: string | null;
  active: boolean;
}

export interface VaeaDetectedQuestion {
  id: string;
  platform: string;
  author_handle: string | null;
  message_body: string;
  combined_score: number;
  disposition: string;
  disposition_reason: string | null;
  extracted_topics: string[];
}

const vaeaGet = <T>(path: string) => gatewayJson<T>(getGateway(), `/vaea${path}`);

export function useVaeaDrafts(limit = 25) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['vaea-drafts', limit], queryFn: async () => (await vaeaGet<{ drafts: VaeaDraft[] }>(`/drafts?limit=${limit}`)).drafts ?? [] });
  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const res = await getGateway()(`/vaea/drafts/${encodeURIComponent(id)}/dismiss`, { method: 'POST' });
      if (!res.ok) throw new GatewayError(res.status, null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vaea-drafts'] }),
  });
  return { ...q, dismiss };
}

export function useVaeaCatalog() {
  return useQuery({ queryKey: ['vaea-catalog'], queryFn: async () => (await vaeaGet<{ items: VaeaCatalogItem[] }>('/catalog')).items ?? [] });
}

export function useVaeaDetected(limit = 25) {
  return useQuery({ queryKey: ['vaea-detected', limit], queryFn: async () => (await vaeaGet<{ questions: VaeaDetectedQuestion[] }>(`/detected-questions?limit=${limit}`)).questions ?? [] });
}

/* ------------------------------------------------------------------ intents (opportunities, listings) */

/** Web `getIncomingMatches` filtered to commercial_sell pairings ("a lead for me"). */
export function useIncomingLeads(enabled: boolean) {
  return useQuery({
    queryKey: ['business-incoming-leads'],
    queryFn: async (): Promise<IntentMatch[]> => {
      const data = await gatewayJson<{ matches?: IntentMatch[] }>(getGateway(), '/intent-matches/incoming?limit=50');
      return (data.matches ?? []).filter((m) => m.kind_pairing.includes('commercial_') && m.kind_pairing.endsWith('commercial_sell'));
    },
    enabled,
  });
}

/** Web `transitionMatch(…, 'responded_by_b')` and `declineMatch`, the incoming card's two actions. */
export function useMatchActions(onDone: () => void) {
  const interest = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await getGateway()(`/intent-matches/${encodeURIComponent(matchId)}/state`, { method: 'POST', body: JSON.stringify({ state: 'responded_by_b' }), headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new GatewayError(res.status, null);
    },
    onSuccess: onDone,
  });
  const decline = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await getGateway()(`/intent-matches/${encodeURIComponent(matchId)}/decline`, { method: 'POST' });
      if (!res.ok) throw new GatewayError(res.status, null);
    },
    onSuccess: onDone,
  });
  return { interest, decline };
}

/** Web `listMyIntents({ kind: 'commercial_sell' })`. */
export function useMyListings(enabled: boolean) {
  return useQuery({
    queryKey: ['business-my-listings'],
    queryFn: async (): Promise<UserIntent[]> => {
      const data = await gatewayJson<{ intents?: UserIntent[] }>(getGateway(), '/intents?kind=commercial_sell');
      return data.intents ?? [];
    },
    enabled,
  });
}
