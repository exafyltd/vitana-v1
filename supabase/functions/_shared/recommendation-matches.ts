/**
 * VTID-04889 — turns the model's answer in `generate-enhanced-recommendations`
 * into rows that are safe to store.
 *
 * The function now runs on Claude through the gateway's Bedrock bridge, which
 * passes the `score_recommendations` tool but cannot force the model to call
 * it. So the raw list comes either from the tool call or from a JSON array in
 * the text, and BOTH paths go through `normalizeRecommendationMatches` — the
 * validation can never be skipped for one of them.
 *
 * Pure TypeScript, no Deno globals: Vitest imports it from `src/lib`.
 */

export type RecommendationType = 'event' | 'group';

export interface RecommendationCandidate {
  id: string;
  type: RecommendationType;
}

export interface RecommendationMatch {
  id: string;
  type: RecommendationType;
  score: number;
  reasons: string[];
}

export const MIN_RECOMMENDATION_SCORE = 0.3;
export const MAX_REASONS = 3;
export const MAX_REASON_LENGTH = 200;

/**
 * The raw match list from a Gemini-shaped bridge response: the tool call's
 * `matches` when the model called the tool, else the outermost `[`…`]` span of
 * the text parsed as JSON. Null when neither yields an array.
 */
export function rawMatchesFromResponse(
  functionCall: { name: string; args: any } | null,
  text: string,
): unknown[] | null {
  if (functionCall && Array.isArray(functionCall.args?.matches)) return functionCall.args.matches;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Keep only matches for candidates this request actually read from the
 * database (same id AND same type), clamp the score to 0..1, drop scores below
 * the threshold, keep at most 3 short reasons, one row per candidate.
 */
export function normalizeRecommendationMatches(
  raw: unknown[],
  candidates: RecommendationCandidate[],
): RecommendationMatch[] {
  const known = new Map<string, RecommendationType>();
  for (const c of candidates) known.set(`${c.type}:${c.id}`, c.type);

  const seen = new Set<string>();
  const out: RecommendationMatch[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const m = item as Record<string, unknown>;
    const id = typeof m.id === 'string' ? m.id : null;
    const type = m.type === 'event' || m.type === 'group' ? m.type : null;
    if (!id || !type) continue;
    const key = `${type}:${id}`;
    if (!known.has(key) || seen.has(key)) continue;

    const n = typeof m.score === 'number' ? m.score : Number(m.score);
    if (!Number.isFinite(n)) continue;
    const score = Math.min(1, Math.max(0, n));
    if (score < MIN_RECOMMENDATION_SCORE) continue;

    const reasons = (Array.isArray(m.reasons) ? m.reasons : [])
      .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      .slice(0, MAX_REASONS)
      .map((r) => (r.length > MAX_REASON_LENGTH ? r.slice(0, MAX_REASON_LENGTH) : r));

    seen.add(key);
    out.push({ id, type, score, reasons });
  }
  return out;
}
