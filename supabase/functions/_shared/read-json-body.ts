/**
 * VTID-05119 — a strict request-body parser for edge functions.
 *
 * A bare `await req.json()` throws on an empty body, and most handlers turn
 * that throw into an HTTP 500. This helper reports what the body was and never
 * substitutes a default: an empty body is `empty`, a JSON object is `json`,
 * anything else (malformed JSON, or JSON that is not a plain object) is
 * `invalid`. Whether `empty` is acceptable is the caller's own, visible choice.
 *
 * Pure TypeScript, no imports, no Deno globals: Vitest imports it from `src/lib`.
 */

export type JsonBodyResult =
  | { kind: 'json'; value: Record<string, unknown> }
  | { kind: 'empty' }
  | { kind: 'invalid' };

export async function readJsonBody(req: Request): Promise<JsonBodyResult> {
  const text = await req.text();
  if (text.trim().length === 0) return { kind: 'empty' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: 'invalid' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'invalid' };
  }
  return { kind: 'json', value: parsed as Record<string, unknown> };
}
