/**
 * Diary → Vitana Index sync helper (VTID-01983).
 *
 * After the local diary insert succeeds, fire a fire-and-forget call to
 * the gateway's POST /api/v1/memory/diary/sync-index endpoint. The gateway
 * runs the deployed VTID-01977 health-feature extractor on raw_text,
 * upserts to health_features_daily, and recomputes vitana_index_scores
 * for the day.
 *
 * Returns the gateway response so the caller can render a celebration
 * toast naming the moved pillars. On failure, logs and returns null —
 * the local diary entry is already saved, so the user never sees an
 * error from a sync hiccup.
 *
 * Used by:
 *   - components/diary/TextDiaryEditor.tsx
 *   - components/memory/VoiceDiaryRecorder.tsx
 *   - components/diary/PhotoDiaryUploader.tsx
 */

import { communityFetch } from "./community-gateway";

export interface DiarySyncResult {
  ok: boolean;
  entry_date: string;
  health_features_written: number;
  pillars_after: {
    total: number;
    nutrition: number;
    hydration: number;
    exercise: number;
    sleep: number;
    mental: number;
  } | null;
  index_delta: {
    total: number;
    nutrition: number;
    hydration: number;
    exercise: number;
    sleep: number;
    mental: number;
  } | null;
}

export async function syncDiaryToIndex(
  rawText: string,
  entryDate?: string,
): Promise<DiarySyncResult | null> {
  if (!rawText || rawText.trim().length === 0) return null;
  try {
    const resp = await communityFetch("/api/v1/memory/diary/sync-index", {
      method: "POST",
      body: JSON.stringify({
        raw_text: rawText,
        entry_date: entryDate || new Date().toISOString().slice(0, 10),
      }),
    });
    if (!resp.ok) {
      console.warn("[diary-sync] gateway returned", resp.status);
      return null;
    }
    return (await resp.json()) as DiarySyncResult;
  } catch (err) {
    console.warn("[diary-sync] sync call failed:", err);
    return null;
  }
}

/**
 * Format the pillar deltas into a human-friendly description for the
 * celebration toast or voice ORB response. Picks at most three pillars
 * with positive movement, sorted desc.
 *
 * "Nutrition +6 · Hydration +6 · Mental +5"
 */
export function formatIndexDelta(delta: DiarySyncResult["index_delta"]): string {
  if (!delta) return "";
  const pillars: Array<[string, number]> = [
    ["Nutrition", delta.nutrition],
    ["Hydration", delta.hydration],
    ["Exercise",  delta.exercise],
    ["Sleep",     delta.sleep],
    ["Mental",    delta.mental],
  ];
  const moved = pillars
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, v]) => `${name} +${v}`);
  return moved.join(" · ");
}
