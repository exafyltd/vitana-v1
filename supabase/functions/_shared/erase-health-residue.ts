/**
 * VTID-05175 (Health Hub Phase 0 / WP4 remainder, package V1-D5R): account
 * deletion reaches the member's health residue outside the tables
 * `erase_user_data()` erases on its own.
 *
 * Three places still hold the member after Step 1b and the Storage walk:
 *   - the vendor side of every wearable link (`user_connections` rows are
 *     erased by `erase_user_data`, but Terra, Vital and the OAuth vendors are
 *     never told, so they keep sending webhooks tagged with the member's id);
 *   - `connector_webhooks_log` rows whose `user_id` is NULL but whose payload
 *     names the member (Terra `user.reference_id`, Vital `client_user_id`, or
 *     the member's vendor ids);
 *   - `partner_health_result_inbox`, which has no `user_id` column but holds
 *     the member in `proposed_user_id` and the candidate/declined arrays.
 * The gateway owns all three and erases them on request (VTID-05174):
 *
 *   POST <GATEWAY_URL>/internal/health-erasure/member-residue   { user_id }
 *     200 → { ok, vendor_revoke: [{ connector_id, status }],
 *             webhook_log: { deleted, residual },
 *             partner_inbox: { deleted, scrubbed, residual }, complete }
 *     409 → { error: 'STAGING_READ_ONLY' }   (staging touches nothing)
 *     503 → { error: 'DB_UNAVAILABLE' }
 *
 * It must run BEFORE `erase_user_data()`: the vendor revoke reads the
 * member's `user_connections` rows (tokens and vendor ids), and those rows
 * are gone after Step 1b.
 *
 * Auth is the same service credential the storage bridge client uses
 * (`GATEWAY_SERVICE_TOKEN` as a bearer), never the member's own JWT.
 *
 * The one rule this module owns: the account is kept unless the gateway
 * answered 200 with `complete === true` and both residual counts a numeric
 * zero. Any other answer (an error status including 404 and 409, a body
 * without those fields, a network error or timeout, a missing token) counts
 * as not erased — the same rule as erase_user_data (VTID-04765) and the
 * Storage walk (VTID-05053). A failed vendor revoke never blocks: it is
 * reported, the local tokens are wiped by the gateway either way.
 */

/** Read via `globalThis`: this file is also imported by a Node/Vitest suite with no Deno types. */
function denoEnv(key: string): string | undefined {
  const deno = (globalThis as { Deno?: { env?: { get(k: string): string | undefined } } }).Deno;
  return deno?.env?.get(key);
}

export const ERASE_HEALTH_RESIDUE_TIMEOUT_MS = 30_000;

export interface VendorRevokeEntry {
  connector_id: string;
  status: string;
}

export interface HealthResidueEraseResult {
  /** True only when the gateway reported `complete: true` with zero residuals. */
  complete: boolean;
  vendor_revoke: VendorRevokeEntry[];
  webhook_log: { deleted: number; residual: number };
  partner_inbox: { deleted: number; scrubbed: number; residual: number };
  error?: string;
}

export interface EraseHealthResidueOptions {
  fetch?: typeof fetch;
  /** Gateway base including `/api/v1`, as the storage bridge client uses it. */
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}

interface ResidueBody {
  error?: unknown;
  complete?: unknown;
  vendor_revoke?: unknown;
  webhook_log?: { deleted?: unknown; residual?: unknown } | null;
  partner_inbox?: { deleted?: unknown; scrubbed?: unknown; residual?: unknown } | null;
}

function notVerified(error: string): HealthResidueEraseResult {
  return {
    complete: false,
    vendor_revoke: [],
    webhook_log: { deleted: 0, residual: -1 },
    partner_inbox: { deleted: 0, scrubbed: 0, residual: -1 },
    error,
  };
}

function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function count(v: unknown): number {
  return isCount(v) ? v : 0;
}

function vendorEntries(v: unknown): VendorRevokeEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e): e is { connector_id?: unknown; status?: unknown } => !!e && typeof e === 'object')
    .map((e) => ({
      connector_id: typeof e.connector_id === 'string' ? e.connector_id : 'unknown',
      status: typeof e.status === 'string' ? e.status : 'unknown',
    }));
}

/** Asks the gateway to revoke the member's vendor links and erase the webhook log and partner inbox residue. */
export async function eraseHealthResidue(
  userId: string,
  opts: EraseHealthResidueOptions = {},
): Promise<HealthResidueEraseResult> {
  const token = opts.token ?? denoEnv('GATEWAY_SERVICE_TOKEN');
  if (!token) return notVerified('GATEWAY_SERVICE_TOKEN not configured');
  const baseUrl = (opts.baseUrl ?? denoEnv('GATEWAY_URL') ?? 'https://gateway.vitanaland.com/api/v1').replace(/\/+$/, '');
  const doFetch = opts.fetch ?? fetch;

  let resp: Response;
  try {
    resp = await doFetch(`${baseUrl}/internal/health-erasure/member-residue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? ERASE_HEALTH_RESIDUE_TIMEOUT_MS),
    });
  } catch (e) {
    return notVerified(`member-residue request failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  let body: ResidueBody | null = null;
  try {
    const parsed: unknown = await resp.json();
    body = parsed && typeof parsed === 'object' ? (parsed as ResidueBody) : null;
  } catch {
    body = null;
  }

  if (resp.status !== 200) {
    const code = typeof body?.error === 'string' ? body.error : 'no error code';
    return notVerified(`member-residue answered ${resp.status} (${code})`);
  }
  if (!body) {
    return notVerified('member-residue answered 200 without a JSON body');
  }

  const webhookResidual = body.webhook_log?.residual;
  const inboxResidual = body.partner_inbox?.residual;
  const result: HealthResidueEraseResult = {
    complete: false,
    vendor_revoke: vendorEntries(body.vendor_revoke),
    webhook_log: { deleted: count(body.webhook_log?.deleted), residual: isCount(webhookResidual) ? webhookResidual : -1 },
    partner_inbox: {
      deleted: count(body.partner_inbox?.deleted),
      scrubbed: count(body.partner_inbox?.scrubbed),
      residual: isCount(inboxResidual) ? inboxResidual : -1,
    },
  };
  if (!isCount(webhookResidual) || !isCount(inboxResidual)) {
    return { ...result, error: 'member-residue answered 200 without numeric residual counts' };
  }
  if (body.complete !== true || webhookResidual !== 0 || inboxResidual !== 0) {
    return {
      ...result,
      error: `member-residue incomplete (complete=${String(body.complete)}, webhook_log.residual=${webhookResidual}, partner_inbox.residual=${inboxResidual})`,
    };
  }
  return { ...result, complete: true };
}

/** True when the member's health residue was verified gone. Vendor revoke failures never count against it. */
export function healthResidueErased(r: HealthResidueEraseResult): boolean {
  return !r.error && r.complete === true && r.webhook_log.residual === 0 && r.partner_inbox.residual === 0;
}

/** Number of connectors whose vendor revoke failed (reported, never blocking). */
export function vendorRevokeFailures(r: HealthResidueEraseResult): number {
  return r.vendor_revoke.filter((e) => e.status === 'failed').length;
}
