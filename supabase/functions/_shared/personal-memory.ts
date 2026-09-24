/**
 * VTID-04453: read the user's personal memory from the canonical store.
 *
 * `ai_memory` was the old frontend memory table. Its rows were copied into
 * `memory_items` (VTID-04388) and nothing writes it any more, so reading it
 * returns a frozen snapshot. This helper returns `memory_items` in the old
 * row shape (`memory_type`, `confidence_score`, `created_at`) so the callers
 * keep their output unchanged.
 *
 * Personal memory only: `active_role IS NULL`. Raw conversation turns
 * (`content_json.direction` = user / assistant) are skipped, the same rule
 * the Memory Garden uses; BackOffice customer and support copies carry a role
 * and are excluded by the role filter.
 */

export interface PersonalMemoryRow {
  id: string;
  memory_type: string;
  content: string;
  confidence_score: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

const RAW_TURN_DIRECTIONS = new Set(['user', 'assistant']);

export function toPersonalMemoryRows(items: any[]): PersonalMemoryRow[] {
  return (items ?? [])
    .filter((i) => !RAW_TURN_DIRECTIONS.has(i?.content_json?.direction))
    .filter((i) => typeof i?.content === 'string' && i.content.trim().length > 0)
    .map((i) => {
      const conf = i.provenance_confidence != null
        ? Number(i.provenance_confidence)
        : Math.min(1, Math.max(0, Number(i.importance ?? 50) / 100));
      return {
        id: i.id,
        memory_type: (i.content_json?.kind as string) || i.category_key || 'note',
        content: i.content,
        confidence_score: Number.isFinite(conf) ? conf : 0.5,
        created_at: i.occurred_at || i.created_at,
        metadata: { source: i.source, category_key: i.category_key },
      };
    });
}

/**
 * All of the user's personal memory rows, newest first, capped. `sinceIso`
 * limits to rows that happened after that time.
 */
export async function fetchPersonalMemory(
  client: any,
  userId: string,
  opts: { limit?: number; sinceIso?: string } = {},
): Promise<{ data: PersonalMemoryRow[]; error: any }> {
  const limit = opts.limit ?? 200;
  let q = client
    .from('memory_items')
    .select('id, category_key, source, content, content_json, importance, provenance_confidence, occurred_at, created_at')
    .eq('user_id', userId)
    .is('active_role', null);
  if (opts.sinceIso) q = q.gte('occurred_at', opts.sinceIso);
  // Over-fetch: raw turns are filtered out after the read.
  const { data, error } = await q.order('occurred_at', { ascending: false }).limit(limit * 3);
  if (error) return { data: [], error };
  return { data: toPersonalMemoryRows(data ?? []).slice(0, limit), error: null };
}

/** Highest confidence first, then newest. */
export function byConfidence(rows: PersonalMemoryRow[]): PersonalMemoryRow[] {
  return [...rows].sort((a, b) =>
    b.confidence_score - a.confidence_score || String(b.created_at).localeCompare(String(a.created_at)));
}
