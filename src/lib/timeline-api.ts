/**
 * VTID-05170 — Life Timeline P4: client for the gateway timeline API
 * (VTID-05169, `/api/v1/timeline`). Text arrives as keys; the screen renders
 * it in the member's language. Influence is only ever what the gateway
 * measured (`measured`) or which pillar an entry counted toward (`counted`).
 */
import { communityFetch } from "@/lib/community-gateway";

export type PillarKey = "nutrition" | "hydration" | "exercise" | "sleep" | "mental";
export const PILLAR_KEYS: PillarKey[] = ["nutrition", "hydration", "exercise", "sleep", "mental"];

export interface TimelineInfluence {
  kind: "measured" | "counted";
  delta_total?: number;
  delta_pillars?: Partial<Record<PillarKey, number>>;
  pillar?: PillarKey;
  movement_id?: string;
}

export interface TimelineMoment {
  kind: "moment";
  id: string;
  at: string;
  tier: "spotlight" | "moment";
  activity_type: string;
  pillar: PillarKey | null;
  secondary_pillar: PillarKey | null;
  category: string;
  topic: string;
  icon: string;
  sensitivity: "standard" | "special_category";
  summary: { key: string; params: Record<string, string | number | boolean> };
  influence: TimelineInfluence | null;
  hidden_from_ai: boolean;
}

export interface TimelineIndexDay {
  kind: "index_day";
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
  kind: "day_digest";
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

export interface TimelineSpotlight {
  score_total: number;
  tier: string;
  change_today: number;
  change_7d: number | null;
  pillars: Record<PillarKey, { score: number; change_today: number; momentum: "rising" | "steady" | "slipping" | "unknown" }>;
  balance: { factor: number | null; penalty_pct: number; reason_key: string; weakest_pillar: PillarKey | null };
  weakest_pillar: PillarKey | null;
  strongest_pillar: PillarKey | null;
  top_contributors: Array<{ trigger: string; source_kind: string | null; delta_total: number; top_pillar: PillarKey | null; at: string }>;
  last_computed: string | null;
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
  from?: string | null;
  to?: string | null;
}

async function json<T>(resp: Response): Promise<T> {
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || body?.ok === false) {
    throw new Error(body?.error || `HTTP ${resp.status}`);
  }
  return body as T;
}

export async function fetchTimelinePage(filters: TimelineFilters, cursor: string | null, limit = 30): Promise<TimelinePage> {
  const qs = new URLSearchParams();
  if (filters.pillar) qs.set("pillar", filters.pillar);
  if (filters.category) qs.set("category", filters.category);
  if (filters.q) qs.set("q", filters.q);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (cursor) qs.set("cursor", cursor);
  qs.set("limit", String(limit));
  const body = await json<TimelinePage>(await communityFetch(`/api/v1/timeline?${qs.toString()}`));
  return { items: body.items ?? [], next_cursor: body.next_cursor ?? null };
}

export async function fetchTimelineSpotlight(): Promise<TimelineSpotlight | null> {
  const body = await json<{ spotlight: TimelineSpotlight | null }>(await communityFetch("/api/v1/timeline/spotlight"));
  return body.spotlight ?? null;
}

export async function fetchTimelineSummary(): Promise<{ pillars: Record<string, number>; categories: Record<string, number>; days: Record<string, number> }> {
  const body = await json<{ summary: { pillars: Record<string, number>; categories: Record<string, number>; days: Record<string, number> } }>(
    await communityFetch("/api/v1/timeline/summary"),
  );
  return body.summary;
}

export async function fetchTimelineItem(id: string): Promise<TimelineItemDetail> {
  return json<TimelineItemDetail>(await communityFetch(`/api/v1/timeline/${encodeURIComponent(id)}`));
}

export async function setTimelineHiddenFromAi(id: string, hidden: boolean): Promise<void> {
  await json(await communityFetch(`/api/v1/timeline/${encodeURIComponent(id)}/hide-from-ai`, {
    method: "POST",
    body: JSON.stringify({ hidden }),
  }));
}

export async function deleteTimelineItem(id: string): Promise<void> {
  await json(await communityFetch(`/api/v1/timeline/${encodeURIComponent(id)}`, { method: "DELETE" }));
}
