/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the Life Timeline data
 * path, re-implemented natively (class-B): the web `src/lib/timeline-api.ts`
 * calls (gateway `/api/v1/timeline`, VTID-05169) and `src/hooks/useTimeline.ts`
 * (one infinite list query, the Index spotlight, one item, hide / delete
 * invalidating everything under `["timeline"]`).
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PillarKey } from '../../../ports/memory';
import { memoryJson } from './client';

export type { PillarKey };
export const PILLAR_KEYS: PillarKey[] = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental'];

export interface TimelineInfluence {
  kind: 'measured' | 'counted';
  delta_total?: number;
  delta_pillars?: Partial<Record<PillarKey, number>>;
  pillar?: PillarKey;
}

export interface TimelineMoment {
  kind: 'moment';
  id: string;
  at: string;
  tier: 'spotlight' | 'moment';
  activity_type: string;
  pillar: PillarKey | null;
  secondary_pillar: PillarKey | null;
  category: string;
  topic: string;
  icon: string;
  sensitivity: 'standard' | 'special_category';
  summary: { key: string; params: Record<string, string | number | boolean> };
  influence: TimelineInfluence | null;
  hidden_from_ai: boolean;
}

export interface TimelineIndexDay {
  kind: 'index_day';
  id: string;
  date: string;
  delta_total: number;
  score_total_after: number | null;
  delta_pillars: Partial<Record<PillarKey, number>>;
  top_pillar: PillarKey | null;
  movements: number;
  daily_update: boolean;
}

export interface TimelineDayDigest {
  kind: 'day_digest';
  id: string;
  date: string;
  counts: Record<string, number>;
  total: number;
}

export type TimelineItem = TimelineMoment | TimelineIndexDay | TimelineDayDigest;

export interface TimelinePage {
  items: TimelineItem[];
  next_cursor: string | null;
}

export type Momentum = 'rising' | 'steady' | 'slipping' | 'unknown';

export interface TimelineSpotlight {
  score_total: number;
  tier: string;
  change_today: number;
  change_7d: number | null;
  pillars: Record<PillarKey, { score: number; change_today: number; momentum: Momentum }>;
  balance: { factor: number | null; penalty_pct: number; reason_key: string; weakest_pillar: PillarKey | null };
  weakest_pillar: PillarKey | null;
  strongest_pillar: PillarKey | null;
}

export interface TimelineItemDetail {
  item: TimelineMoment;
  detail: {
    index_before: Record<string, number> | null;
    index_after: Record<string, number> | null;
    used_by_vitana: boolean;
    why_kept_key: string;
  };
}

export interface TimelineFilters {
  pillar?: PillarKey | null;
  category?: string | null;
  q?: string | null;
}

export async function fetchTimelinePage(filters: TimelineFilters, cursor: string | null, limit = 30): Promise<TimelinePage> {
  const qs = new URLSearchParams();
  if (filters.pillar) qs.set('pillar', filters.pillar);
  if (filters.category) qs.set('category', filters.category);
  if (filters.q) qs.set('q', filters.q);
  if (cursor) qs.set('cursor', cursor);
  qs.set('limit', String(limit));
  const body = await memoryJson<Partial<TimelinePage>>(`/timeline?${qs.toString()}`);
  return { items: body.items ?? [], next_cursor: body.next_cursor ?? null };
}

export async function fetchTimelineSpotlight(): Promise<TimelineSpotlight | null> {
  const body = await memoryJson<{ spotlight?: TimelineSpotlight | null }>('/timeline/spotlight');
  return body.spotlight ?? null;
}

export const fetchTimelineItem = (id: string) => memoryJson<TimelineItemDetail>(`/timeline/${encodeURIComponent(id)}`);

export async function setTimelineHiddenFromAi(id: string, hidden: boolean): Promise<void> {
  await memoryJson(`/timeline/${encodeURIComponent(id)}/hide-from-ai`, { method: 'POST', body: JSON.stringify({ hidden }) });
}

export async function deleteTimelineItem(id: string): Promise<void> {
  await memoryJson(`/timeline/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export const timelineKeys = {
  all: ['timeline'] as const,
  list: (f: TimelineFilters) => ['timeline', 'list', f.pillar ?? null, f.category ?? null, f.q ?? null, null, null] as const,
  spotlight: ['timeline', 'spotlight'] as const,
  item: (id: string) => ['timeline', 'item', id] as const,
};

export function useTimeline(filters: TimelineFilters) {
  const query = useInfiniteQuery<TimelinePage>({
    queryKey: timelineKeys.list(filters),
    queryFn: ({ pageParam }) => fetchTimelinePage(filters, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
  });
  const seen = new Set<string>();
  const items = (query.data?.pages ?? []).flatMap((p) => p.items).filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  return { ...query, items };
}

export function useTimelineSpotlight() {
  return useQuery({ queryKey: timelineKeys.spotlight, queryFn: fetchTimelineSpotlight, staleTime: 60_000 });
}

export function useTimelineItem(id: string | null) {
  return useQuery({ queryKey: timelineKeys.item(id ?? ''), queryFn: () => fetchTimelineItem(id as string), enabled: !!id });
}

export function useTimelineActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: timelineKeys.all });
  const hide = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => setTimelineHiddenFromAi(id, hidden),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteTimelineItem(id), onSuccess: invalidate });
  return { hide, remove };
}
