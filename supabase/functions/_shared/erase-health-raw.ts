/**
 * VTID-05160 (Health Hub Phase 1, package A3): account deletion reaches the
 * health raw-batch bucket.
 *
 * The health store (vitana-platform A1/A2) keeps each member's raw ingest
 * batches for 30 days in a dedicated S3 bucket under `u/<user_id>/`. That
 * bucket is not a Storage bucket, so neither `erase_user_data()` (tables) nor
 * `erase-user-storage.ts` (Storage buckets through the storage bridge) reach
 * it. The gateway owns it and erases it on request:
 *
 *   POST <GATEWAY_URL>/health/internal/erase-raw   { user_id }
 *     200 → { deleted, residual }   (deleted every object, then listed again)
 *     404 → { error: 'HEALTH_STORE_DISABLED' }   (store never enabled: nothing stored)
 *
 * Auth is the same service credential the storage bridge client uses
 * (`GATEWAY_SERVICE_TOKEN` as a bearer), never the member's own JWT.
 *
 * The one rule this module owns: the account is kept unless the bucket was
 * verified empty for the member — an answer with `residual: 0`, or the
 * store-disabled 404. Any other answer (an error status, a 404 without that
 * code, a body without a numeric residual, a network error, a missing token)
 * counts as not erased, the same rule as erase_user_data (VTID-04765) and the
 * Storage walk (VTID-05053): deleting the account while raw batches remain
 * would leave health data behind with no account left to erase it from.
 */

/** Read via `globalThis`: this file is also imported by a Node/Vitest suite with no Deno types. */
function denoEnv(key: string): string | undefined {
  const deno = (globalThis as { Deno?: { env?: { get(k: string): string | undefined } } }).Deno;
  return deno?.env?.get(key);
}

export const HEALTH_STORE_DISABLED = 'HEALTH_STORE_DISABLED';
export const ERASE_HEALTH_RAW_TIMEOUT_MS = 60_000;

export interface HealthRawEraseResult {
  /** Objects the gateway deleted. */
  deleted: number;
  /** Objects still listed after the delete; -1 when it could not be verified. */
  residual: number;
  /** True when the gateway answered 404 HEALTH_STORE_DISABLED (nothing was ever stored). */
  disabled: boolean;
  error?: string;
}

export interface EraseHealthRawOptions {
  fetch?: typeof fetch;
  /** Gateway base including `/api/v1`, as the storage bridge client uses it. */
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}

interface EraseRawBody {
  error?: unknown;
  deleted?: unknown;
  residual?: unknown;
}

function notVerified(error: string): HealthRawEraseResult {
  return { deleted: 0, residual: -1, disabled: false, error };
}

function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/** Asks the gateway to delete every raw health batch of the member, then reports what is left. */
export async function eraseHealthRaw(
  userId: string,
  opts: EraseHealthRawOptions = {},
): Promise<HealthRawEraseResult> {
  const token = opts.token ?? denoEnv('GATEWAY_SERVICE_TOKEN');
  if (!token) return notVerified('GATEWAY_SERVICE_TOKEN not configured');
  const baseUrl = (opts.baseUrl ?? denoEnv('GATEWAY_URL') ?? 'https://gateway.vitanaland.com/api/v1').replace(/\/+$/, '');
  const doFetch = opts.fetch ?? fetch;

  let resp: Response;
  try {
    resp = await doFetch(`${baseUrl}/health/internal/erase-raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? ERASE_HEALTH_RAW_TIMEOUT_MS),
    });
  } catch (e) {
    return notVerified(`erase-raw request failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  let body: EraseRawBody | null = null;
  try {
    const parsed: unknown = await resp.json();
    body = parsed && typeof parsed === 'object' ? (parsed as EraseRawBody) : null;
  } catch {
    body = null;
  }

  if (resp.status === 404 && body?.error === HEALTH_STORE_DISABLED) {
    return { deleted: 0, residual: 0, disabled: true };
  }
  if (!resp.ok) {
    const code = typeof body?.error === 'string' ? body.error : 'no error code';
    return notVerified(`erase-raw answered ${resp.status} (${code})`);
  }
  if (!body || !isCount(body.residual)) {
    return notVerified(`erase-raw answered ${resp.status} without a residual count`);
  }
  return { deleted: isCount(body.deleted) ? body.deleted : 0, residual: body.residual, disabled: false };
}

/** True when the member's raw health batches were verified gone (or never stored). */
export function healthRawFullyErased(r: HealthRawEraseResult): boolean {
  return !r.error && r.residual === 0;
}
