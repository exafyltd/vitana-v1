/**
 * VTID-05184 — wire types of Health Sync contract v1 (N5a, plan change 2).
 *
 * The request shape mirrors the vendored contract-v1.schema.json (BatchV1);
 * the code lists mirror the golden "contract self-check" `error_codes`
 * (tests/health-sync/contract.test.ts compares them).
 */
import type { Category } from './catalogue';

export const CONTRACT_VERSION = '1.0';
export const CONTRACT_MAJOR = 1;

export const LIMITS = {
  maxCompressedBytes: 524_288,
  maxInflatedBytes: 4_194_304,
  maxRecords: 1_000,
  maxDeletions: 1_000,
  maxStages: 200,
  tooOldDays: 400,
  futureToleranceMinutes: 5,
  defaultBackfillDays: 90,
  fiveMinuteWindowDays: 30,
} as const;

export type SourceKind = 'apple_health' | 'health_connect';
export type WirePlatform = 'ios' | 'android';

export interface SourceV1 {
  kind: SourceKind;
  install_id: string;
  platform: WirePlatform;
  os_version: string;
  app_version: string;
  device?: { manufacturer?: string; model?: string };
}

export type SleepStage = 'awake' | 'light' | 'deep' | 'rem' | 'asleep' | 'in_bed' | 'out_of_bed';

export interface SleepStageV1 {
  stage: SleepStage;
  start: string;
  end: string;
}

export interface StatsV1 {
  n: number;
  sum: number;
  min: number;
  max: number;
}

export interface RecordV1 {
  record_id: string;
  type: string;
  value?: number;
  stats?: StatsV1;
  unit: string;
  start: string;
  end: string;
  tz: string;
  origin_app_id?: string;
  stages?: SleepStageV1[];
}

export interface DeletionV1 {
  record_id: string;
  type: string;
}

export type SyncMode = 'incremental' | 'backfill';

export interface BatchV1 {
  contract_version: string;
  batch_id: string;
  source: SourceV1;
  sync_mode: SyncMode;
  records: RecordV1[];
  deletions: DeletionV1[];
}

export const RECORD_ERROR_CODES = [
  'UNSUPPORTED_TYPE',
  'UNIT_MISMATCH',
  'IMPLAUSIBLE_VALUE',
  'OUT_OF_WINDOW',
  'CATEGORY_NOT_CONSENTED',
  'INVALID_RECORD',
  'STORE_UNAVAILABLE',
] as const;
export type RecordErrorCode = (typeof RECORD_ERROR_CODES)[number];

export const BATCH_ERROR_CODES = {
  INVALID_BATCH: { status: 400, retryable: false },
  UNSUPPORTED_CONTRACT_VERSION: { status: 400, retryable: false },
  UNAUTHENTICATED: { status: 401, retryable: true },
  TENANT_REQUIRED: { status: 400, retryable: false },
  CONSENT_REQUIRED: { status: 403, retryable: false },
  SOURCE_PAUSED: { status: 409, retryable: false },
  INGEST_DISABLED: { status: 409, retryable: false },
  BATCH_ID_REUSED: { status: 409, retryable: false },
  BATCH_TOO_LARGE: { status: 413, retryable: false },
  UNSUPPORTED_ENCODING: { status: 415, retryable: false },
  RATE_LIMITED: { status: 429, retryable: true },
  STORE_PENDING: { status: 503, retryable: true },
  STORE_UNAVAILABLE: { status: 503, retryable: true },
} as const;
export type BatchErrorCode = keyof typeof BATCH_ERROR_CODES;

/** Answers of the shared auth middleware in front of every route (contract §2/§7). */
export const AUTH_MIDDLEWARE_CODES = {
  TENANT_NOT_MEMBER: { status: 403 },
  TENANT_CHECK_UNAVAILABLE: { status: 503 },
  DELEGATED_TOKEN_NOT_ALLOWED: { status: 403 },
} as const;
export type AuthMiddlewareCode = keyof typeof AUTH_MIDDLEWARE_CODES;

export type ConsentAnswer = 'granted' | 'not_granted';
export type ServerSourceState = 'connected' | 'paused' | 'disconnected' | 'not_connected' | 'store_pending' | 'unknown' | string;

export interface IngestOk {
  ok: true;
  batch_id: string;
  replay: boolean;
  counts: { stored: number; duplicate: number; updated: number; deleted: number; rejected: number };
  rejected: { record_id: string; code: RecordErrorCode; retryable?: boolean }[];
  consent?: Partial<Record<Category, ConsentAnswer>>;
  source_state?: ServerSourceState;
}

export interface IngestError {
  ok: false;
  error: string;
  retryable?: boolean;
  message?: string;
  categories?: Category[];
  details?: unknown;
  reason?: string;
  retry_after_s?: number;
}
