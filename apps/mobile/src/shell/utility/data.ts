/**
 * VTID-05653 (native-wave2-fix-forward-r2/utility-bar) — the shared utility
 * bar's reads and the gift-voucher calls, moved from VTID-05510's
 * `screens/discover/data/utility.ts` unchanged (`logActivity` stays there, its
 * only callers are Discover pages). Each
 * web hook is class B: the web Supabase client / `import.meta.env`):
 *
 *  - `useCalendarEvents` — `src/hooks/useCalendarEvents.ts:108-140, :727-732`
 *    as UniversalCalendarButton reads it: the member's `calendar_events` by
 *    start time; upcoming = after now, first 10; the conflict count;
 *  - `useVitanaIndex` — `VitanaIndexValue` / `useVitanaIndexCache`
 *    (["vitana_index","current"]): trailing 7 days of `vitana_index_scores`,
 *    the `health_compute_vitana_index` self-heal, then the latest-ever row;
 *  - `useAutopilotPendingCount` — the part of `src/hooks/use-autopilot.ts` the
 *    Autopilot chip reads: `GET /autopilot/recommendations/count` on mount and
 *    every 5 min; with AI-data consent (`useAIConsent`: the device flag or
 *    `user_preferences.ai_data_consent_given`, the row created when missing
 *    like `useUserPreferences`) the 5-min poll also reads the list, and
 *    `pendingCount` = the `new` recommendations not in the member's dismissed
 *    set (`vitana.autopilot.dismissed_ids:<user>`);
 *  - `createVoucherCheckout` — `src/hooks/useVouchers.ts` useCreateVoucherCheckout:
 *    the `stripe-create-voucher-checkout` edge function `{ tier, returnTo }`,
 *    then the post-purchase reads (`fetchVoucherOrder`, `downloadVoucherPdf`,
 *    `sendVoucherEmail`);
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../auth/client';
import { getGateway } from '../../auth/gateway';
import { useAuth } from '../../auth/AuthProvider';
import { deviceStorage } from '../../identity/device-storage';

/** The gateway's active-role header (screens/discover/data/client.ts:27, unchanged). */
const ACTIVE_ROLE_HEADER = 'X-Vitana-Active-Role';

const db = () => getSupabase() as any;

// ── calendar ─────────────────────────────────────────────────────────────
export interface CalendarEventRow {
  id: string;
  start_time: string;
  status?: string | null;
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['calendar-events', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db().from('calendar_events').select('*').eq('user_id', user?.id).order('start_time', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CalendarEventRow[];
    },
  });
  const events = query.data ?? [];
  const now = Date.now();
  return {
    events,
    upcoming: events.filter((e) => new Date(e.start_time).getTime() > now).slice(0, 10),
    conflictCount: events.filter((e) => e.status === 'conflict').length,
  };
}

// ── vitana index ─────────────────────────────────────────────────────────
const INDEX_SELECT_COLUMNS = 'date, score_total, score_nutrition, score_hydration, score_exercise, score_sleep, score_mental, confidence, model_version, feature_inputs';

export async function fetchVitanaIndex(userId: string | undefined): Promise<{ total: number } | null> {
  if (!userId) return null;
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const fromDate = from.toISOString().slice(0, 10);
  const trailing = async () => {
    const { data, error } = await db().from('vitana_index_scores').select(INDEX_SELECT_COLUMNS).eq('user_id', userId).gte('date', fromDate).order('date', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  };
  let rows = await trailing();
  if (rows.length === 0) {
    try {
      await db().rpc('health_compute_vitana_index', { p_date: new Date().toISOString().slice(0, 10), p_model_version: 'v3-5pillar' });
      rows = await trailing();
    } catch {
      /* best-effort */
    }
  }
  if (rows.length === 0) {
    const { data, error } = await db().from('vitana_index_scores').select(INDEX_SELECT_COLUMNS).eq('user_id', userId).order('date', { ascending: false }).limit(1);
    if (error) throw new Error(error.message);
    rows = (data ?? []) as any[];
  }
  if (rows.length === 0) return null;
  return { total: rows[rows.length - 1].score_total };
}

export function useVitanaIndex() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['vitana_index', 'current'], queryFn: () => fetchVitanaIndex(user?.id), staleTime: 60_000, enabled: !!user });
  return { index: query.data ?? null, isLoading: query.isLoading };
}

// ── autopilot pending count ──────────────────────────────────────────────
export const AUTOPILOT_ROLE = 'community';
export const CONSENT_KEY = 'vitana_ai_consent_given';
export const dismissedKey = (userId: string) => `vitana.autopilot.dismissed_ids:${userId}`;
const POLL_MS = 5 * 60 * 1000;

function autopilotGet(path: string, userId: string) {
  return getGateway()(path, { headers: { 'Content-Type': 'application/json', 'X-User-ID': userId, [ACTIVE_ROLE_HEADER]: AUTOPILOT_ROLE } });
}

function useAIConsentFlag(): boolean {
  const { user } = useAuth();
  const [local, setLocal] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.resolve(deviceStorage.getItem(CONSENT_KEY)).then((v) => {
      if (active && v === 'true') setLocal(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const prefs = useQuery({
    queryKey: ['user_preferences'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db().from('user_preferences').select('*').eq('user_id', user?.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        const created = await db().from('user_preferences').insert({ user_id: user?.id }).select().single();
        if (created.error) throw new Error(created.error.message);
        return created.data as { ai_data_consent_given?: boolean };
      }
      return data as { ai_data_consent_given?: boolean };
    },
  });
  return local || prefs.data?.ai_data_consent_given === true;
}

export function useAutopilotPendingCount(): number {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const hasConsent = useAIConsentFlag();
  const [pending, setPending] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!userId) return;
    try {
      await autopilotGet(`/autopilot/recommendations/count?role=${AUTOPILOT_ROLE}`, userId);
    } catch {
      /* the count only feeds badges */
    }
  }, [userId]);

  const fetchRecommendations = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await autopilotGet(`/autopilot/recommendations?status=new,activated&limit=20&role=${AUTOPILOT_ROLE}`, userId);
      if (!res.ok) return;
      const text = await res.text();
      const json = (text ? JSON.parse(text) : {}) as { ok?: boolean; recommendations?: Array<{ id: string; status: string }> };
      if (!json.ok) return;
      const raw = await deviceStorage.getItem(dismissedKey(userId));
      let dismissed = new Set<string>();
      try {
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) dismissed = new Set(arr.filter((x): x is string => typeof x === 'string'));
      } catch {
        /* unreadable — nothing dismissed */
      }
      setPending((json.recommendations ?? []).filter((r) => !dismissed.has(r.id) && r.status !== 'activated').length);
    } catch {
      /* the popup surfaces list errors; the chip keeps its count */
    }
  }, [userId]);

  useEffect(() => {
    void fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!userId) return undefined;
    const id = setInterval(() => {
      void fetchCount();
      if (hasConsent) void fetchRecommendations();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [userId, hasConsent, fetchCount, fetchRecommendations]);

  return pending;
}

// ── gift voucher ─────────────────────────────────────────────────────────
/** The function's response: `{ url, session_id, order_id }` (stripe-create-voucher-checkout/index.ts:179-184). */
export interface VoucherCheckout {
  url?: string;
  session_id?: string;
  order_id?: string;
}

export async function createVoucherCheckout(tier: 'test' | 'experience' | 'exclusive', returnTo: string): Promise<VoucherCheckout> {
  const { data, error } = await db().functions.invoke('stripe-create-voucher-checkout', { body: { tier, returnTo } });
  if (error) throw error;
  return (data ?? {}) as VoucherCheckout;
}

/**
 * The member's voucher order, read the way the web's `useMyVouchers` reads
 * `voucher_orders` (`src/hooks/useVouchers.ts:76-80`: own rows by
 * `buyer_user_id`, newest first) narrowed to the checkout's order id; without
 * an id, the member's latest order. `status` is `pending` until the Stripe
 * webhook marks it `paid` (stripe-webhook/index.ts:309-315).
 */
export async function fetchVoucherOrder(orderId: string | undefined): Promise<{ id: string; status: string } | null> {
  const { data: auth } = await db().auth.getSession();
  const userId = auth?.session?.user?.id;
  if (!userId) return null;
  let q = db().from('voucher_orders').select('*').eq('buyer_user_id', userId);
  if (orderId) q = q.eq('id', orderId);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as { id: string; status: string } | null;
}

export const VOUCHER_STATUS_ATTEMPTS = 4;
export const VOUCHER_STATUS_DELAY_MS = 1000;

/** Re-reads the order until it is `paid` (the webhook can trail the browser closing); null when it never is. */
export async function waitForPaidVoucherOrder(orderId: string | undefined, attempts = VOUCHER_STATUS_ATTEMPTS, delayMs = VOUCHER_STATUS_DELAY_MS): Promise<{ id: string; status: string } | null> {
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
    const order = await fetchVoucherOrder(orderId);
    if (order?.status === 'paid') return order;
  }
  return null;
}

/** `useDownloadVoucherPdf` (`src/hooks/useVouchers.ts:37-48`) — `voucher-download-pdf` with `{ orderId }`, the member's session. */
export interface VoucherPdfData {
  code: string;
  tier: string;
  tierName: string;
  price: string;
  purchaseDate: string;
  expiresAt: string;
  benefits: string[];
  buyerEmail: string;
  orderId: string;
}

export async function downloadVoucherPdf(orderId: string): Promise<{ success: boolean; voucher: VoucherPdfData; signedPdfUrl: string }> {
  const { data, error } = await db().functions.invoke('voucher-download-pdf', { body: { orderId } });
  if (error) throw error;
  return data as { success: boolean; voucher: VoucherPdfData; signedPdfUrl: string };
}

/** `useSendVoucherEmail` (`src/hooks/useVouchers.ts:50-66`) — `voucher-send-email`. */
export async function sendVoucherEmail(input: { orderId: string; recipientEmail: string; recipientName?: string; message?: string }): Promise<unknown> {
  const { data, error } = await db().functions.invoke('voucher-send-email', { body: input });
  if (error) throw error;
  return data;
}
