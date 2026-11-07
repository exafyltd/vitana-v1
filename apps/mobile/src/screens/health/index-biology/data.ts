/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the reads
 * the Vitana Index page adds on top of health-hub's native health-data module
 * (the Index, lab reports and supplements come from there, never re-fetched):
 *
 *  - "has the member uploaded a blood panel?" (`useHasBloodPanel`,
 *    VitanaIndexDetail.tsx:115-128). The web counts `lab_reports` rows with
 *    `report_type = 'blood_panel'` as a HEAD request and relies on RLS; the
 *    native read asks for at most one id with a GET (the network guard allows
 *    GETs only) and adds the explicit `user_id = auth.uid()` filter, like
 *    health-hub's `useLabReports`. Same answer: at least one row → done.
 *  - the Mission Alignment queue (`MissionAlignmentCard.tsx:137-170`,
 *    `GET /api/v1/autopilot/recommendations?limit=200&status=new` with the
 *    community role header), aggregated by the same pure `aggregate()`
 *    (:62-99).
 *  - the per-device feature-card dismissals of the card strip
 *    (`useCardDismiss.ts`: key `vitana.card.<type>.dismissed_at`, 7-day TTL),
 *    over AsyncStorage. Device-local only; no server call.
 *
 * READS ONLY: every Supabase request is a select, every gateway call a GET.
 */
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import { gatewayJson } from '../../../ports/core';
import { deviceStorage } from '../../../identity/device-storage';
import { FEATURE_CARD_DISMISS_TTL_MS, featureCardDismissKey, type VitanaCardType } from '../../../ports/health-biology';
import { LAB_REPORTS_TABLE } from '../data/records';
import type { VitanaPillarKey } from '../data/vitana-index';

// ── blood panel ─────────────────────────────────────────────────────────
export function useHasBloodPanel() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['lab-reports', 'has-blood-panel', userId ?? null],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await getSupabase().from(LAB_REPORTS_TABLE).select('id').eq('user_id', userId).eq('report_type', 'blood_panel').limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });
}

// ── mission alignment ───────────────────────────────────────────────────
export const PILLAR_ORDER: readonly VitanaPillarKey[] = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental'];
export const ECONOMIC_AXES = ['find_match', 'marketplace', 'income_generation', 'business_formation'] as const;
export type EconomicAxis = (typeof ECONOMIC_AXES)[number] | 'none';

export interface RecommendationRow {
  id: string;
  title?: string | null;
  economic_axis?: string | null;
  pillar_impact?: { primary_pillar: VitanaPillarKey | null; magnitude?: string } | null;
}

export interface AggregateBuckets {
  total: number;
  served: number;
  pillarCounts: Record<VitanaPillarKey | 'none', number>;
  economyCounts: Record<EconomicAxis, number>;
}

/** MissionAlignmentCard.tsx:62-99. */
export function aggregate(rows: RecommendationRow[]): AggregateBuckets {
  const pillarCounts: AggregateBuckets['pillarCounts'] = { nutrition: 0, hydration: 0, exercise: 0, sleep: 0, mental: 0, none: 0 };
  const economyCounts: AggregateBuckets['economyCounts'] = { find_match: 0, marketplace: 0, income_generation: 0, business_formation: 0, none: 0 };
  let served = 0;
  rows.forEach((row) => {
    const pillar = row.pillar_impact?.primary_pillar ?? null;
    if (pillar && pillar in pillarCounts) pillarCounts[pillar] += 1;
    else pillarCounts.none += 1;
    const axisRaw = row.economic_axis ?? 'none';
    const axis: EconomicAxis = (ECONOMIC_AXES as readonly string[]).includes(axisRaw) ? (axisRaw as EconomicAxis) : 'none';
    economyCounts[axis] += 1;
    if (pillar || axis !== 'none') served += 1;
  });
  return { total: rows.length, served, pillarCounts, economyCounts };
}

export const MISSION_ALIGNMENT_PATH = '/autopilot/recommendations?limit=200&status=new';

export function useMissionAlignment() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['mission-alignment', userId ?? null],
    enabled: !!userId,
    retry: false,
    queryFn: async (): Promise<RecommendationRow[]> => {
      const json = await gatewayJson<{ ok?: boolean; recommendations?: unknown; error?: string }>(getGateway(), MISSION_ALIGNMENT_PATH, {
        headers: { 'X-Vitana-Active-Role': 'community' },
      });
      if (json?.ok && Array.isArray(json.recommendations)) return json.recommendations as RecommendationRow[];
      throw new Error(json?.error || 'unknown_error');
    },
  });
}

// ── feature-card dismissals (per device) ───────────────────────────────
const withinTtl = (at: number, now: number) => Number.isFinite(at) && now - at < FEATURE_CARD_DISMISS_TTL_MS;

/** The feature cards hidden on this device (read once per mount) and the X that hides one for 7 days. */
export function useFeatureCardDismissals(types: readonly VitanaCardType[], now: () => number = Date.now) {
  const [dismissed, setDismissed] = useState<ReadonlySet<VitanaCardType>>(new Set());
  const [ready, setReady] = useState(types.length === 0);
  const signature = types.join(',');
  useEffect(() => {
    let cancelled = false;
    void Promise.all(types.map(async (type) => [type, await deviceStorage.getItem(featureCardDismissKey(type))] as const)).then((entries) => {
      if (cancelled) return;
      const at = now();
      setDismissed(new Set(entries.filter(([, raw]) => !!raw && withinTtl(Number(raw), at)).map(([type]) => type)));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // `signature` stands for `types`; `now` is a clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const dismiss = useCallback(
    (type: VitanaCardType) => {
      setDismissed((prev) => new Set([...prev, type]));
      void deviceStorage.setItem(featureCardDismissKey(type), String(now()));
    },
    [now],
  );
  return { dismissed, ready, dismiss };
}
