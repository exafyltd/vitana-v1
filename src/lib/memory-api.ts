/**
 * VTID-04389 / VTID-04390: the Memory Garden and the diary go through the
 * gateway, which reads and writes the canonical memory store
 * (`memory_facts` + `memory_items`) — the same store Vitana recalls from.
 * Before this, the Garden read `ai_memory` / `diary_entries` directly and
 * never showed what Vitana actually remembers.
 */
import { communityFetch } from "@/lib/community-gateway";
import type { DiarySyncResult } from "@/lib/diary-index-sync";

export const GARDEN_CATEGORY_IDS = [
  "personal_identity",
  "health_wellness",
  "lifestyle_routines",
  "network_relationships",
  "learning_knowledge",
  "business_projects",
  "finance_assets",
  "location_environment",
  "digital_footprint",
  "values_aspirations",
  "autopilot_context",
  "future_plans",
  "uncategorized",
] as const;
export type GardenCategoryId = (typeof GARDEN_CATEGORY_IDS)[number];

/** The UI uses dashed ids and two legacy names; the API uses snake_case. */
const UI_TO_API: Record<string, GardenCategoryId> = {
  "autopilot-settings": "autopilot_context",
  general: "uncategorized",
};
const API_TO_UI: Record<string, string> = {
  autopilot_context: "autopilot-settings",
  uncategorized: "general",
};

export function toApiCategory(uiId: string | undefined | null): GardenCategoryId | undefined {
  if (!uiId) return undefined;
  if (UI_TO_API[uiId]) return UI_TO_API[uiId];
  const snake = uiId.replace(/-/g, "_");
  return (GARDEN_CATEGORY_IDS as readonly string[]).includes(snake) ? (snake as GardenCategoryId) : undefined;
}

export function toUiCategory(apiId: string): string {
  return API_TO_UI[apiId] ?? apiId.replace(/_/g, "-");
}

export interface GardenEntry {
  kind: "fact" | "episode";
  id: string;
  category: GardenCategoryId;
  content: string;
  fact_key?: string;
  episode_kind?: string;
  source: string;
  confidence: number | null;
  user_confirmed: boolean;
  occurred_at: string;
}

export interface GardenCategorySummary {
  category: GardenCategoryId;
  count: number;
  last_updated_at: string | null;
}

async function json<T>(resp: Response): Promise<T> {
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || body?.ok === false) {
    throw new Error(body?.error || `HTTP ${resp.status}`);
  }
  return body as T;
}

export async function fetchGardenEntries(opts: { category?: GardenCategoryId; limit?: number } = {}): Promise<GardenEntry[]> {
  const qs = new URLSearchParams();
  if (opts.category) qs.set("category", opts.category);
  if (opts.limit) qs.set("limit", String(opts.limit));
  const q = qs.toString();
  const body = await json<{ entries: GardenEntry[] }>(
    await communityFetch(`/api/v1/memory/garden/entries${q ? `?${q}` : ""}`),
  );
  return body.entries ?? [];
}

export async function fetchGardenCategories(): Promise<{ total: number; categories: GardenCategorySummary[] }> {
  const body = await json<{ total: number; categories: GardenCategorySummary[] }>(
    await communityFetch("/api/v1/memory/garden/categories"),
  );
  return { total: body.total ?? 0, categories: body.categories ?? [] };
}

export async function addGardenNote(content: string, category: GardenCategoryId): Promise<string | null> {
  const body = await json<{ id: string | null }>(
    await communityFetch("/api/v1/memory/garden/entries", {
      method: "POST",
      body: JSON.stringify({ kind: "note", content, category }),
    }),
  );
  return body.id ?? null;
}

export async function editGardenEntry(
  kind: "fact" | "episode",
  id: string,
  content: string,
  category?: GardenCategoryId,
): Promise<void> {
  await json(
    await communityFetch(`/api/v1/memory/garden/entries/${kind}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(category ? { content, category } : { content }),
    }),
  );
}

export async function deleteGardenEntry(kind: "fact" | "episode", id: string): Promise<void> {
  await json(
    await communityFetch(`/api/v1/memory/garden/entries/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

export type DiarySource = "text" | "voice" | "photo" | "manual";

/** The Vitana Index sync the diary endpoint runs (same shape as /memory/diary/sync-index). */
export type DiaryIndexResult = Omit<DiarySyncResult, "ok">;

export interface SavedDiaryEntry {
  entry: { id: string; created_at: string };
  memory_item_id: string | null;
  index: DiaryIndexResult | null;
}

/** The one diary write path: diary row + memory episode + Vitana Index sync. */
export async function saveDiaryEntry(input: {
  text: string;
  source: DiarySource;
  tags?: string[];
  duration?: number | null;
  attachments?: string[] | null;
  entry_date?: string;
}): Promise<SavedDiaryEntry> {
  return json<SavedDiaryEntry>(
    await communityFetch("/api/v1/memory/diary/entries", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  await json(await communityFetch(`/api/v1/memory/diary/entries/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export interface DailyLearning {
  id: string;
  date: string;
  content: string;
  created_at: string;
}

/** VTID-04391: what Vitana learned each day, newest first. */
export async function fetchDailyLearnings(limit = 14): Promise<DailyLearning[]> {
  const body = await json<{ learnings: DailyLearning[] }>(
    await communityFetch(`/api/v1/memory/daily-learning?limit=${limit}`),
  );
  return body.learnings ?? [];
}
