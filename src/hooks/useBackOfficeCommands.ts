/**
 * VTID-03849 — BackOffice wave-1 Read screens: data hooks.
 *
 * Every ERP read goes through the gateway's command orchestrator
 * (`POST /api/v1/backoffice/commands`, VTID-03842) exactly like a write would:
 * capability check, idempotency, receipt, audit row, OASIS event. The browser
 * never talks to ERPClaw or the bridge. Command history, approvals, the
 * independent audit log and the tenant policy are plain gateway GETs.
 *
 * Read tier only (execution brief: "Read-tier first"). Nothing here submits a
 * Draft/Commit command or decides an approval — those land in the next slice.
 */
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export type CommandTier = "read" | "draft" | "commit" | "high";
export type CommandStatus = "executed" | "failed" | "awaiting_approval" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type CommandChannel = "web" | "chat" | "voice" | "system";

/** Bridge receipt as stored on the command row (VTID-03840 `BridgeReceipt`). */
export interface BackOfficeReceipt {
  status?: "executed" | "failed";
  replayed?: boolean;
  idempotency_key?: string;
  action?: string;
  command?: string;
  tier?: string;
  rc?: number;
  duration_ms?: number;
  result?: unknown;
  stderr_tail?: string;
  error?: string;
  detail?: unknown;
  http?: number;
  [k: string]: unknown;
}

/** `publicCommand()` in the gateway orchestrator. */
export interface BackOfficeCommand {
  command_id: string;
  type: string;
  action: string;
  tier: CommandTier;
  status: CommandStatus;
  reason: string | null;
  approval_id: string | null;
  receipt: BackOfficeReceipt | null;
  escalations: string[];
  channel: CommandChannel;
  requester_id: string;
  created_at: string;
  executed_at: string | null;
  replayed?: boolean;
}

export interface BackOfficeApproval {
  id: string;
  command_id: string;
  tenant_id: string;
  requester_id: string;
  approve_capability: string;
  status: ApprovalStatus;
  reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  /** Computed by the gateway for the caller: maker-checker + capability + MFA + web. */
  can_decide: boolean;
}

export interface BackOfficeAuditRow {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  actor_role: string | null;
  channel: string | null;
  event: string;
  command_id: string | null;
  approval_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface BackOfficePolicy {
  high_risk_amount_threshold: number;
  require_mfa_for_high: boolean;
}

export interface CommandResponse {
  ok: boolean;
  command?: BackOfficeCommand;
  error?: string;
  issues?: string[];
  required_capability?: string | null;
  entity?: { field: string; ref: string; candidates: unknown[] };
}

/** i18n keys under `screens.backoffice.errors.*` — pages render `t(key)`. */
export type BackOfficeErrorKey =
  | "bridgeUnavailable"
  | "noCapability"
  | "erpFailed"
  | "unauthorized"
  | "noTenant"
  | "notFound"
  | "generic";

export class BackOfficeCommandError extends Error {
  readonly key: BackOfficeErrorKey;
  readonly status: number;
  readonly body: CommandResponse | null;
  constructor(status: number, body: CommandResponse | null, key: BackOfficeErrorKey) {
    super(key);
    this.name = "BackOfficeCommandError";
    this.status = status;
    this.body = body;
    this.key = key;
  }
}

/** Gateway regex for idempotency keys: /^[A-Za-z0-9_.:\-]{8,128}$/ */
const IDEMPOTENCY_RE = /^[A-Za-z0-9_.:-]{8,128}$/;
export const READ_KEY_BUCKET_MS = 60_000;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const o = value as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`).join(",")}}`;
}

/** djb2 over the stable JSON — enough to tell two payloads apart in a key. */
export function payloadHash(payload: Record<string, unknown>): string {
  const s = stableJson(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * Read keys are bucketed per minute: a re-mount inside the bucket replays the
 * stored receipt (no second bridge call, no second ERPClaw run); a later
 * bucket fetches fresh data. Never reused across command types or payloads.
 */
export function readIdempotencyKey(type: string, payload: Record<string, unknown> = {}, now: number = Date.now()): string {
  const key = `ui.read:${type}:${payloadHash(payload)}:${Math.floor(now / READ_KEY_BUCKET_MS)}`;
  if (!IDEMPOTENCY_RE.test(key)) throw new Error(`idempotency key out of shape: ${key}`);
  return key;
}

export function errorKeyFor(status: number, body: CommandResponse | null): BackOfficeErrorKey {
  const err = body?.error ?? body?.command?.reason ?? "";
  if (status === 503 || err === "bridge_not_configured") return "bridgeUnavailable";
  if (status === 401) return "unauthorized";
  if (status === 403 || err === "FORBIDDEN" || err === "missing_capability") return "noCapability";
  if (status === 404) return "notFound";
  if (err === "NO_TENANT_CONTEXT") return "noTenant";
  if (status === 502 || err === "erp_action_failed") return "erpFailed";
  return "generic";
}

/** Map any thrown error (adminFetch's `Error(body.error)` included) to an i18n key. */
export function errorKeyOf(err: unknown): BackOfficeErrorKey {
  if (err instanceof BackOfficeCommandError) return err.key;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (msg === "NO_AUTH_TOKEN" || msg === "UNAUTHORIZED" || msg === "HTTP 401") return "unauthorized";
  if (msg === "FORBIDDEN" || msg === "HTTP 403") return "noCapability";
  if (msg === "NO_TENANT_CONTEXT") return "noTenant";
  if (msg === "NOT_FOUND" || msg === "HTTP 404") return "notFound";
  if (msg === "bridge_not_configured" || msg === "HTTP 503") return "bridgeUnavailable";
  return "generic";
}

const RAW_GATEWAY = (import.meta.env.VITE_GATEWAY_URL as string | undefined) || "";
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

/**
 * POST /api/v1/backoffice/commands. Unlike `adminFetch` this never throws on a
 * non-2xx: a rejected/failed command is a real answer with a command row and a
 * reason, and the caller decides how to show it.
 */
export async function postBackOfficeCommand(input: {
  type: string;
  payload?: Record<string, unknown>;
  idempotency_key: string;
  channel?: CommandChannel;
  confirm?: boolean;
}): Promise<{ status: number; body: CommandResponse }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new BackOfficeCommandError(401, null, "unauthorized");
  const res = await fetch(`${GATEWAY_BASE}/api/v1/backoffice/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      type: input.type,
      payload: input.payload ?? {},
      idempotency_key: input.idempotency_key,
      channel: input.channel ?? "web",
      confirm: input.confirm ?? false,
    }),
  });
  const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as CommandResponse;
  return { status: res.status, body };
}

/** The ERPClaw JSON the bridge captured for an executed command (`receipt.result`). */
export function commandResult<T = unknown>(cmd: BackOfficeCommand | null | undefined): T | null {
  const r = cmd?.receipt?.result;
  return r === undefined ? null : (r as T);
}

/** As-of time for the "source + as-of timestamp" rule (design gate §1.3, Read tier). */
export function commandAsOf(cmd: BackOfficeCommand | null | undefined): string | null {
  return cmd?.executed_at ?? cmd?.created_at ?? null;
}

export interface ErpReadData<T> {
  result: T;
  command: BackOfficeCommand;
}

/** Run one Read-tier typed command and return its ERPClaw result + the command row. */
export function useErpRead<T = unknown>(type: string, payload: Record<string, unknown> = {}, opts: { enabled?: boolean } = {}) {
  const { activeTenantId } = useTenant();
  return useQuery<ErpReadData<T>, BackOfficeCommandError>({
    queryKey: ["backoffice-read", activeTenantId, type, payload],
    queryFn: async () => {
      const { status, body } = await postBackOfficeCommand({ type, payload, idempotency_key: readIdempotencyKey(type, payload) });
      if (!body.ok || !body.command || body.command.status !== "executed") {
        throw new BackOfficeCommandError(status, body, errorKeyFor(status, body));
      }
      return { result: commandResult<T>(body.command) as T, command: body.command };
    },
    enabled: opts.enabled ?? true,
    staleTime: READ_KEY_BUCKET_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useBackOfficeCommands(opts: { status?: CommandStatus; limit?: number; enabled?: boolean } = {}) {
  const { activeTenantId } = useTenant();
  const limit = opts.limit ?? 50;
  return useQuery<BackOfficeCommand[]>({
    queryKey: ["backoffice-commands", activeTenantId, opts.status ?? "all", limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (opts.status) qs.set("status", opts.status);
      const res = (await adminFetch(`/api/v1/backoffice/commands?${qs}`)) as { commands: BackOfficeCommand[] };
      return res.commands ?? [];
    },
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useBackOfficeCommand(commandId: string | null) {
  const { activeTenantId } = useTenant();
  return useQuery<BackOfficeCommand>({
    queryKey: ["backoffice-command", activeTenantId, commandId],
    queryFn: async () => ((await adminFetch(`/api/v1/backoffice/commands/${encodeURIComponent(commandId as string)}`)) as { command: BackOfficeCommand }).command,
    enabled: !!commandId,
    staleTime: 30_000,
  });
}

export function useBackOfficeApprovals(status: ApprovalStatus = "pending", opts: { limit?: number; enabled?: boolean } = {}) {
  const { activeTenantId } = useTenant();
  const limit = opts.limit ?? 50;
  return useQuery<BackOfficeApproval[]>({
    queryKey: ["backoffice-approvals", activeTenantId, status, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ status, limit: String(limit) });
      const res = (await adminFetch(`/api/v1/backoffice/approvals?${qs}`)) as { approvals: BackOfficeApproval[] };
      return res.approvals ?? [];
    },
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useBackOfficeAudit(opts: { limit?: number; command_id?: string; enabled?: boolean } = {}) {
  const { activeTenantId } = useTenant();
  const limit = opts.limit ?? 100;
  return useQuery<BackOfficeAuditRow[]>({
    queryKey: ["backoffice-audit", activeTenantId, limit, opts.command_id ?? null],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (opts.command_id) qs.set("command_id", opts.command_id);
      const res = (await adminFetch(`/api/v1/backoffice/audit?${qs}`)) as { audit: BackOfficeAuditRow[] };
      return res.audit ?? [];
    },
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useBackOfficePolicy(opts: { enabled?: boolean } = {}) {
  const { activeTenantId } = useTenant();
  return useQuery<{ policy: BackOfficePolicy; defaults: BackOfficePolicy }>({
    queryKey: ["backoffice-policy", activeTenantId],
    queryFn: async () => (await adminFetch(`/api/v1/backoffice/policy`)) as { policy: BackOfficePolicy; defaults: BackOfficePolicy },
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** any-of capability check against `/me` (Exafy super-admins receive the full catalog there). */
export function hasAnyCapability(capabilities: readonly string[] | null | undefined, required: readonly string[]): boolean {
  if (!capabilities) return false;
  return required.some((c) => capabilities.includes(c));
}

export function shortId(id: string | null | undefined, n = 8): string {
  if (!id) return "—";
  return id.length > n ? id.slice(0, n) : id;
}
