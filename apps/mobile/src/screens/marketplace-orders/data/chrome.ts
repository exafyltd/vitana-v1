/**
 * VTID-05511 — the data behind the utility bar's global pills, re-implemented
 * natively (the web hooks are class-B), reads unchanged:
 *  - `useCalendarEvents` (src/hooks/useCalendarEvents.ts:108-140): the
 *    member's `calendar_events` by start time → upcoming (first 10 in the
 *    future, `getUpcomingEvents(10)`) and the `conflict` count;
 *  - `useVitanaIndex` (src/hooks/useVitanaIndex.ts:88-160): the trailing 7
 *    days of `vitana_index_scores`, the per-user compute RPC when that window
 *    is empty, then the latest-ever row; the chip shows today's `score_total`;
 *  - `useVitanaStreaks` (src/hooks/useVitanaStreaks.ts): consecutive local
 *    days in the device store `vitana:streak:active-days`;
 *  - `useAutopilot().pendingCount` (src/hooks/use-autopilot.ts:236-290, :484-487):
 *    GET `/autopilot/recommendations?status=new,activated&limit=20&role=community`
 *    (the phone role, useAutopilotRole.ts:31), minus the ids the member
 *    dismissed (`vitana.autopilot.dismissed_ids:<user>`), `activated` ones
 *    excluded (they map to `executing`, not `pending`);
 *  - `useCreateVoucherCheckout` (src/hooks/useVouchers.ts:12-23).
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../auth/AuthProvider';
import { getGateway } from '../../../auth/gateway';
import { db, readJson } from './client';

// ── calendar ─────────────────────────────────────────────────────────────
export interface CalendarEventRow {
  id: string;
  start_time: string;
  status?: string;
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['calendar-events', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CalendarEventRow[]> => {
      const { data, error } = await db().from('calendar_events').select('*').eq('user_id', user?.id).order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEventRow[];
    },
  });
  const events = q.data ?? [];
  const now = Date.now();
  return {
    upcoming: events.filter((e) => new Date(e.start_time).getTime() > now).slice(0, 10),
    conflictCount: events.filter((e) => e.status === 'conflict').length,
  };
}

// ── Vitana Index ─────────────────────────────────────────────────────────
const INDEX_SELECT_COLUMNS = 'date, score_total, score_nutrition, score_hydration, score_exercise, score_sleep, score_mental, confidence, model_version, feature_inputs';

export async function fetchVitanaIndexTotal(userId: string): Promise<number | null> {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const fromDate = from.toISOString().slice(0, 10);
  const trailing = async () => {
    const { data, error } = await db().from('vitana_index_scores').select(INDEX_SELECT_COLUMNS).eq('user_id', userId).gte('date', fromDate).order('date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Array<{ score_total: number }>;
  };
  let rows = await trailing();
  if (rows.length === 0) {
    try {
      await db().rpc('health_compute_vitana_index', { p_date: new Date().toISOString().slice(0, 10), p_model_version: 'v3-5pillar' });
      rows = await trailing();
    } catch {
      /* best-effort, like the web */
    }
  }
  if (rows.length === 0) {
    const { data, error } = await db().from('vitana_index_scores').select(INDEX_SELECT_COLUMNS).eq('user_id', userId).order('date', { ascending: false }).limit(1);
    if (error) throw error;
    rows = (data ?? []) as Array<{ score_total: number }>;
  }
  if (rows.length === 0) return null;
  return rows[rows.length - 1].score_total;
}

export function useVitanaIndexTotal() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['vitana_index', 'current'], enabled: !!user, staleTime: 60_000, queryFn: () => fetchVitanaIndexTotal(user?.id as string) });
  return { total: q.data ?? null, isLoading: q.isLoading };
}

// ── streak ───────────────────────────────────────────────────────────────
export const STREAK_STORE_KEY = 'vitana:streak:active-days';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function streakFrom(days: readonly string[], today: Date = new Date()): number {
  const set = new Set(days);
  let count = 0;
  const cursor = new Date(today);
  while (set.has(dayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function useVitanaStreak(): number {
  const [days, setDays] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STREAK_STORE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw) as { days?: unknown };
          if (Array.isArray(parsed.days)) setDays(parsed.days.filter((d): d is string => typeof d === 'string'));
        } catch {
          /* unreadable store: no streak */
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return streakFrom(days);
}

// ── Autopilot pending count ─────────────────────────────────────────────
export const AUTOPILOT_ROLE = 'community';

export async function fetchAutopilotPending(userId: string): Promise<number> {
  const res = await getGateway()(`/autopilot/recommendations?status=new,activated&limit=20&role=${encodeURIComponent(AUTOPILOT_ROLE)}`, {
    headers: { 'Content-Type': 'application/json', 'X-User-ID': userId, 'X-Vitana-Active-Role': AUTOPILOT_ROLE },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const json = await readJson<{ ok?: boolean; recommendations?: Array<{ id: string; status: string }> }>(res);
  if (!json.ok) return 0;
  let dismissed = new Set<string>();
  try {
    const raw = await AsyncStorage.getItem(`vitana.autopilot.dismissed_ids:${userId}`);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(arr)) dismissed = new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    /* no dismissed set */
  }
  return (json.recommendations ?? []).filter((r) => !dismissed.has(r.id) && r.status !== 'activated').length;
}

export function useAutopilotPendingCount(): number {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['autopilot-pending', user?.id], enabled: !!user, queryFn: () => fetchAutopilotPending(user?.id as string) });
  return q.data ?? 0;
}

// ── gift voucher checkout ───────────────────────────────────────────────
export type VoucherTier = 'test' | 'experience' | 'exclusive';

export async function createVoucherCheckout(tier: VoucherTier, returnTo: string): Promise<{ url?: string }> {
  const { data, error } = await db().functions.invoke('stripe-create-voucher-checkout', { body: { tier, returnTo } });
  if (error) throw error;
  return (data ?? {}) as { url?: string };
}
