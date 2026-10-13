/**
 * VTID-05184 — response handling table (N5a, plan change 9).
 *
 * Typed `Record<BatchErrorCode | AuthMiddlewareCode, …>` and
 * `Record<RecordErrorCode, …>`: a contract code without a branch fails `tsc`.
 */
import {
  AUTH_MIDDLEWARE_CODES,
  BATCH_ERROR_CODES,
  type AuthMiddlewareCode,
  type BatchErrorCode,
  type IngestError,
  type IngestOk,
  type RecordErrorCode,
} from './contract/v1/wire';
import { HOUR_MS, MINUTE_MS } from './time';

export type BatchAction =
  | { kind: 'drop_invalid' } // 400 INVALID_BATCH
  | { kind: 'upgrade_required' } // 400 UNSUPPORTED_CONTRACT_VERSION
  | { kind: 'refresh_and_retry' } // 401
  | { kind: 'auth_paused' } // tenant / delegated token
  | { kind: 'consent_required' } // 403 CONSENT_REQUIRED
  | { kind: 'source_paused' } // 409 SOURCE_PAUSED
  | { kind: 'server_disabled' } // 409 INGEST_DISABLED
  | { kind: 'rebuild_new_id' } // 409 BATCH_ID_REUSED
  | { kind: 'split' } // 413
  | { kind: 'retry_without_gzip' } // 415
  | { kind: 'retry_after' } // 429
  | { kind: 'backoff'; baseMs: number; capMs: number }; // 503s

export const NETWORK_BACKOFF = { baseMs: 30_000, capMs: 6 * HOUR_MS } as const;

export const BATCH_ACTIONS: Record<BatchErrorCode | AuthMiddlewareCode, BatchAction> = {
  INVALID_BATCH: { kind: 'drop_invalid' },
  UNSUPPORTED_CONTRACT_VERSION: { kind: 'upgrade_required' },
  UNAUTHENTICATED: { kind: 'refresh_and_retry' },
  TENANT_REQUIRED: { kind: 'auth_paused' },
  TENANT_NOT_MEMBER: { kind: 'auth_paused' },
  DELEGATED_TOKEN_NOT_ALLOWED: { kind: 'auth_paused' },
  TENANT_CHECK_UNAVAILABLE: { kind: 'backoff', ...NETWORK_BACKOFF },
  CONSENT_REQUIRED: { kind: 'consent_required' },
  SOURCE_PAUSED: { kind: 'source_paused' },
  INGEST_DISABLED: { kind: 'server_disabled' },
  BATCH_ID_REUSED: { kind: 'rebuild_new_id' },
  BATCH_TOO_LARGE: { kind: 'split' },
  UNSUPPORTED_ENCODING: { kind: 'retry_without_gzip' },
  RATE_LIMITED: { kind: 'retry_after' },
  STORE_PENDING: { kind: 'backoff', baseMs: 5 * MINUTE_MS, capMs: 24 * HOUR_MS },
  STORE_UNAVAILABLE: { kind: 'backoff', ...NETWORK_BACKOFF },
};

export type RecordAction =
  | 'requeue_new_batch' // STORE_UNAVAILABLE (retryable: re-send in a NEW batch)
  | 'not_consented' // CATEGORY_NOT_CONSENTED
  | 'drop' // dropped and counted
  | 'drop_contract_mismatch'; // dropped, counted, raises contract_mismatch

export const RECORD_ACTIONS: Record<RecordErrorCode, RecordAction> = {
  UNSUPPORTED_TYPE: 'drop_contract_mismatch',
  UNIT_MISMATCH: 'drop_contract_mismatch',
  IMPLAUSIBLE_VALUE: 'drop',
  OUT_OF_WINDOW: 'drop',
  CATEGORY_NOT_CONSENTED: 'not_consented',
  // Also covers the store's MISALIGNED_BUCKET (a clock edge), so NOT a contract mismatch (F4).
  INVALID_RECORD: 'drop',
  STORE_UNAVAILABLE: 'requeue_new_batch',
};

export const KNOWN_CODES = new Set<string>([...Object.keys(BATCH_ERROR_CODES), ...Object.keys(AUTH_MIDDLEWARE_CODES)]);

export type Classified =
  | { type: 'ok'; body: IngestOk }
  | { type: 'error'; code: BatchErrorCode | AuthMiddlewareCode; action: BatchAction; body: IngestError; retryAfterMs: number | null }
  | { type: 'transport'; reason: 'network' | 'timeout' | 'non_json' | 'unexpected'; status: number | null };

export interface HttpResult {
  status: number;
  headers: Record<string, string>;
  json: unknown;
}

function retryAfterMs(headers: Record<string, string>, body: IngestError): number | null {
  const h = headers['retry-after'] ?? headers['Retry-After'];
  if (h !== undefined && /^\d+$/.test(h.trim())) return Number(h.trim()) * 1000;
  if (h !== undefined) {
    const t = Date.parse(h);
    if (Number.isFinite(t)) return Math.max(0, t - Date.now());
  }
  if (typeof body.retry_after_s === 'number') return body.retry_after_s * 1000;
  return null;
}

/** Status + JSON → what to do. Anything unrecognised is a transport-level back-off. */
export function classify(res: HttpResult | { error: 'network' | 'timeout' }): Classified {
  if ('error' in res) return { type: 'transport', reason: res.error, status: null };
  const body = res.json as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object') return { type: 'transport', reason: 'non_json', status: res.status };
  if (res.status === 200 && body.ok === true) return { type: 'ok', body: body as unknown as IngestOk };
  const code = typeof body.error === 'string' ? body.error : '';
  if (KNOWN_CODES.has(code)) {
    const c = code as BatchErrorCode | AuthMiddlewareCode;
    return { type: 'error', code: c, action: BATCH_ACTIONS[c], body: body as unknown as IngestError, retryAfterMs: retryAfterMs(res.headers, body as unknown as IngestError) };
  }
  return { type: 'transport', reason: 'unexpected', status: res.status };
}

/** Exponential back-off with jitter: base · 2^attempt, capped, then 50–100 %. */
export function backoffMs(attempt: number, baseMs: number, capMs: number, rand: () => number = Math.random): number {
  const raw = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.round(raw * (0.5 + 0.5 * rand()));
}
