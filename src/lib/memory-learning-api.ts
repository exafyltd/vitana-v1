/**
 * VTID-05172 — Life Timeline P6: what Vitana learns, and the member's controls.
 * Gateway (VTID-05171, `/api/v1/timeline/...`):
 *   learning-prefs  per-category "Vitana may learn from this" (missing = on)
 *   usage-data      the stored-but-never-shown rows (screen visits, technical traces): count, export, delete
 *   routines        what Vitana noticed (kind + key + metadata; the app writes the sentence)
 */
import { communityFetch } from "@/lib/community-gateway";

export const PILLAR_CATEGORIES = ["nutrition", "hydration", "exercise", "sleep", "mental"] as const;
export const LIFE_CATEGORIES = ["cross_pillar", "diary", "goals", "journey", "vitana", "community", "events", "live_media", "shop", "wallet", "account"] as const;
export type LearnableCategory = (typeof PILLAR_CATEGORIES)[number] | (typeof LIFE_CATEGORIES)[number] | "app_usage";

export interface LearningPrefs {
  available: boolean;
  prefs: Array<{ category: LearnableCategory; learn: boolean }>;
}

export interface UsageData {
  available: boolean;
  count: number | null;
}

export type RoutineKind =
  | "screen_habit" | "active_hours" | "feature_affinity" | "pillar_rhythm"
  | "time_of_day_preference" | "day_of_week_rhythm" | "category_affinity" | "wave_velocity" | "completion_streak";

export interface Routine {
  id: string;
  routine_kind: RoutineKind;
  routine_key: string;
  metadata: Record<string, unknown> | null;
  confidence: number;
  evidence_count?: number;
  last_observed?: string;
}

async function json<T>(resp: Response): Promise<T> {
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || body?.ok === false) throw new Error(body?.error || `HTTP ${resp.status}`);
  return body as T;
}

export async function fetchLearningPrefs(): Promise<LearningPrefs> {
  return json<LearningPrefs>(await communityFetch("/api/v1/timeline/learning-prefs"));
}

export async function setLearningPref(category: LearnableCategory, learn: boolean): Promise<{ routines_deleted: number }> {
  return json(await communityFetch("/api/v1/timeline/learning-prefs", { method: "PUT", body: JSON.stringify({ category, learn }) }));
}

export async function fetchUsageData(): Promise<UsageData> {
  return json<UsageData>(await communityFetch("/api/v1/timeline/usage-data"));
}

export async function exportUsageData(): Promise<Blob> {
  const body = await json<Record<string, unknown>>(await communityFetch("/api/v1/timeline/usage-data/export"));
  return new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
}

export async function deleteUsageData(): Promise<{ deleted: number; routines_deleted: number }> {
  return json(await communityFetch("/api/v1/timeline/usage-data", { method: "DELETE" }));
}

export async function fetchRoutines(): Promise<Routine[]> {
  return (await json<{ routines: Routine[] }>(await communityFetch("/api/v1/timeline/routines"))).routines ?? [];
}

export async function forgetRoutine(id: string): Promise<void> {
  await json(await communityFetch(`/api/v1/timeline/routines/${encodeURIComponent(id)}`, { method: "DELETE" }));
}
