/**
 * VTID-05184 — the Logger port drops health values (N5a, plan change 12).
 *
 * Logs carry codes, counts, types and categories only; any field named
 * value, stats, record_id, stages, start or end — at any depth — is removed
 * before the sink sees it (mirrors C1's OASIS rule).
 */
import type { LogFields, LoggerPort } from './ports';

export const FORBIDDEN_LOG_FIELDS = new Set(['value', 'stats', 'record_id', 'stages', 'start', 'end', 'records', 'deletions', 'payload', 'body', 'json']);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_LOG_FIELDS.has(k)) continue;
      out[k] = redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function createRedactingLogger(sink: (event: string, fields: LogFields) => void): LoggerPort {
  return {
    log(event, fields = {}) {
      sink(event, redact(fields) as LogFields);
    },
  };
}

/** Dev-only console sink; silent in release builds. */
export const consoleLogger: LoggerPort = createRedactingLogger((event, fields) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[health-sync] ${event}`, fields);
});
