/**
 * VTID-05221: exafy-admin tenant provisioning client ("New community" panel).
 *
 * Mirrors the gateway contract in exafyltd/vitana-platform:
 *   - services/gateway/src/services/tenant-provisioning/schemas.ts
 *       ProvisionTenantSchema, TenantBrandPackPatchSchema, ASSET_KINDS,
 *       JEV_MONTHLY_BUDGET_MAX_USD, SLUG_RE
 *   - services/gateway/src/routes/admin-tenants.ts (mounted at /api/v1/admin/tenants)
 *       GET  /                  list            PATCH /:id               brand pack / open_signup
 *       GET  /:id               detail          PUT   /:id/assets/:kind  logo | favicon | og_image
 *       POST /                  provision       GET   /:id/readiness     readiness checklist
 *     Every route is exafy_admin only: verifyExafyAdmin answers 403 FORBIDDEN
 *     (the auth gate); NOT_EXAFY_ADMIN is the separate provision_tenant() DB check.
 *
 * The JSON wrappers go through adminFetch. Asset upload cannot: adminFetch forces
 * Content-Type: application/json and the route answers 415 unless the declared
 * type equals the sniffed image type, so uploadTenantAsset sends the raw File with
 * its real MIME type using the same token and base-URL logic as adminFetch.
 *
 * Keep this file in step with schemas.ts — the tests pin the request shapes.
 */

import { supabase } from "@/integrations/supabase/client";
import { adminFetch } from "@/lib/admin-api";

// ── Constants (mirrors of schemas.ts / admin-tenants.ts) ────────────────────

/** schemas.ts ASSET_KINDS. */
export const ASSET_KINDS = ["logo", "favicon", "og_image"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/** admin-tenants.ts ALLOWED_ASSET_TYPES (GIF and SVG are refused). */
export const ALLOWED_ASSET_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedAssetMime = (typeof ALLOWED_ASSET_MIME)[number];

/** schemas.ts JEV_MONTHLY_BUDGET_MAX_USD. */
export const JEV_MONTHLY_BUDGET_MAX_USD = 500;

/** schemas.ts SLUG_RE (byte-identical). */
export const TENANT_SLUG_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** ProvisionTenantSchema slug length bounds. */
export const TENANT_SLUG_MIN_LENGTH = 3;
export const TENANT_SLUG_MAX_LENGTH = 32;

/** schemas.ts LandingSchema cta values. */
export const LANDING_CTAS = ["invite_only", "signup", "waitlist"] as const;
export type LandingCta = (typeof LANDING_CTAS)[number];

// ── Request types (mirror the zod schemas exactly; both are .strict()) ──────

/** ProvisionTenantSchema — POST /api/v1/admin/tenants. */
export interface ProvisionTenantInput {
  slug: string;
  name: string;
  admin_email: string;
  all_members_group_name: string;
  display_name?: string;
  jev_monthly_budget_usd?: number;
  default_locale?: string;
  enabled_locales?: string[];
  timezone?: string;
  currency?: string;
}

/** PersonaFactsSchema — facts only, never a sentence Vitana speaks. */
export interface TenantPersonaFacts {
  community_name?: string;
  community_pronunciation?: string;
  anchor_person?: { name: string; pronunciation?: string; role?: string };
  story_facts?: string[];
  offer_facts?: string[];
  tone?: string[];
}

/** BrandSchema — asset paths are set by the asset route only. */
export interface TenantBrand {
  colors?: { accent: string; bg: string; fg: string };
  tokens?: Record<string, string | number>;
}

/** LandingSchema. */
export interface TenantLanding {
  cta?: LandingCta;
}

/** TenantBrandPackPatchSchema — PATCH /api/v1/admin/tenants/:id. */
export interface TenantBrandPackPatch {
  display_name?: string;
  brand?: TenantBrand;
  legal_entity_line?: string;
  support_email?: string;
  sender_name?: string;
  sender_email?: string;
  default_locale?: string;
  enabled_locales?: string[];
  timezone?: string;
  currency?: string;
  landing?: TenantLanding;
  persona_facts?: TenantPersonaFacts;
  open_signup?: boolean;
  /** Required by the server (TENANT_NOT_READY) only when opening sign-up on a tenant that is not ready. */
  override_reason?: string;
}

// ── Response types (admin-tenants.ts response bodies) ───────────────────────

/** GET / row. */
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  user_count: number;
  status: "Active" | "Empty";
  created_at: string | null;
  updated_at: string | null;
}

export interface TenantMember {
  user_id: string;
  email: string | null;
  display_name: string | null;
  active_role: string | null;
  is_primary: boolean | null;
}

/** GET /:id tenant. */
export interface TenantDetail extends TenantSummary {
  members: TenantMember[];
}

/** POST / body (201 created, 200 already provisioned). `id` mirrors `tenant_id`. */
export interface ProvisionedTenant {
  id: string;
  tenant_id: string;
  slug: string;
  created: boolean;
  invitation: {
    id: string | null;
    expires_at: string | null;
    reused: boolean;
    /** Path the operator hands to the first admin (no invitation email yet). */
    accept_path: string | null;
  };
  ensured: unknown;
}

/** PATCH /:id body. */
export interface TenantBrandPackPatchResult {
  tenant_id: string;
  updated_fields: string[];
  settings: Record<string, unknown> | null;
}

/** PUT /:id/assets/:kind body. */
export interface TenantAssetUploadResult {
  path: string;
  mime_type: AllowedAssetMime;
  size_bytes: number;
}

/** readiness.ts ReadinessCheck. */
export interface TenantReadinessCheck {
  key: string;
  ok: boolean;
  detail: string;
  informational?: boolean;
}

/** GET /:id/readiness body. */
export interface TenantReadiness {
  ok: true;
  tenant_id: string;
  slug: string | null;
  ready: boolean;
  legacy: boolean;
  schema_missing: boolean;
  checks: TenantReadinessCheck[];
}

// ── Errors ──────────────────────────────────────────────────────────────────

const ERROR_KEY_PREFIX = "tenantProvisioning.errors.";

/** Server code → i18n key suffix. Anything else INVALID_* falls back to INVALID. */
const CODE_KEY: Record<string, string> = {
  FORBIDDEN: "FORBIDDEN",
  NOT_EXAFY_ADMIN: "NOT_EXAFY_ADMIN",
  RESERVED_SLUG: "RESERVED_SLUG",
  SLUG_TAKEN: "SLUG_TAKEN",
  INVALID_SLUG: "INVALID_SLUG",
  INVALID_ADMIN_EMAIL: "INVALID_ADMIN_EMAIL",
  SERVICE_ACCOUNT_EMAIL: "SERVICE_ACCOUNT_EMAIL",
  INVALID_LOCALE: "INVALID_LOCALE",
  INVALID_TIMEZONE: "INVALID_TIMEZONE",
  UNSUPPORTED_TYPE: "UNSUPPORTED_MEDIA_TYPE",
  TOO_LARGE: "TOO_LARGE",
  TENANT_NOT_READY: "OVERRIDE_REASON_REQUIRED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
  LEGACY_TENANT_READ_ONLY: "LEGACY_TENANT_READ_ONLY",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_TOKEN: "UNAUTHENTICATED",
  NO_AUTH_TOKEN: "UNAUTHENTICATED",
  DB_UNAVAILABLE: "UNAVAILABLE",
  PROVISIONING_UNAVAILABLE: "UNAVAILABLE",
  STORAGE_UNAVAILABLE: "UNAVAILABLE",
};

/**
 * HTTP status per code as admin-tenants.ts answers it. adminFetch throws only the
 * `error` string, so the JSON wrappers recover the status from the code.
 */
const CODE_STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  INVALID_TOKEN: 401,
  NO_AUTH_TOKEN: 401,
  FORBIDDEN: 403,
  NOT_EXAFY_ADMIN: 403,
  RESERVED_SLUG: 400,
  SLUG_TAKEN: 409,
  SERVICE_ACCOUNT_EMAIL: 400,
  VALIDATION_FAILED: 400,
  INVALID_BODY: 400,
  TENANT_NOT_FOUND: 404,
  TENANT_NOT_READY: 409,
  LEGACY_TENANT_READ_ONLY: 409,
  NO_DEFAULT_TENANT: 409,
  NO_NOTIFICATION_BASELINE: 409,
  TOO_LARGE: 413,
  UNSUPPORTED_TYPE: 415,
  INTERNAL_ERROR: 500,
  DB_UNAVAILABLE: 503,
  PROVISIONING_UNAVAILABLE: 503,
  STORAGE_UNAVAILABLE: 503,
};

/** Map a gateway error code (and HTTP status, when known) to its i18n key. */
export function errorI18nKey(code: string, status: number): string {
  const direct = CODE_KEY[code];
  if (direct) return ERROR_KEY_PREFIX + direct;
  if (code.startsWith("INVALID_")) return `${ERROR_KEY_PREFIX}INVALID`;
  if (status === 415) return `${ERROR_KEY_PREFIX}UNSUPPORTED_MEDIA_TYPE`;
  if (status === 403) return `${ERROR_KEY_PREFIX}FORBIDDEN`;
  if (status === 401) return `${ERROR_KEY_PREFIX}UNAUTHENTICATED`;
  if (status === 413) return `${ERROR_KEY_PREFIX}TOO_LARGE`;
  return `${ERROR_KEY_PREFIX}UNKNOWN`;
}

export class TenantProvisioningError extends Error {
  code: string;
  /** HTTP status; 0 when no response was received (network, client-side reject). */
  status: number;
  i18nKey: string;
  details?: unknown;

  constructor(code: string, status: number, details?: unknown) {
    super(code);
    this.name = "TenantProvisioningError";
    this.code = code;
    this.status = status;
    this.i18nKey = errorI18nKey(code, status);
    this.details = details;
  }
}

function statusForCode(code: string): number {
  if (code in CODE_STATUS) return CODE_STATUS[code];
  const http = /^HTTP (\d{3})$/.exec(code);
  if (http) return Number(http[1]);
  if (code.startsWith("INVALID_")) return 400;
  return 0;
}

/** adminFetch throws `new Error(body.error || body.message || "HTTP <status>")`. */
function fromAdminFetchError(err: unknown): TenantProvisioningError {
  if (err instanceof TenantProvisioningError) return err;
  if (err instanceof TypeError) return new TenantProvisioningError("NETWORK_ERROR", 0);
  const message = err instanceof Error ? err.message : String(err);
  const http = /^HTTP (\d{3})$/.exec(message);
  if (http) return new TenantProvisioningError(`HTTP_${http[1]}`, Number(http[1]));
  return new TenantProvisioningError(message, statusForCode(message));
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return (await adminFetch(path, init)) as T;
  } catch (err) {
    throw fromAdminFetchError(err);
  }
}

const BASE_PATH = "/api/v1/admin/tenants";
const tenantPath = (id: string) => `${BASE_PATH}/${encodeURIComponent(id)}`;

// ── JSON wrappers (adminFetch) ──────────────────────────────────────────────

export async function listTenants(): Promise<TenantSummary[]> {
  const body = await call<{ tenants?: TenantSummary[] }>(BASE_PATH);
  return body.tenants ?? [];
}

export async function getTenant(id: string): Promise<TenantDetail> {
  const body = await call<{ tenant: TenantDetail }>(tenantPath(id));
  return body.tenant;
}

export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionedTenant> {
  const body = await call<Omit<ProvisionedTenant, "id">>(BASE_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    id: body.tenant_id,
    tenant_id: body.tenant_id,
    slug: body.slug,
    created: body.created,
    invitation: body.invitation,
    ensured: body.ensured,
  };
}

export async function patchTenantBrandPack(
  id: string,
  patch: TenantBrandPackPatch,
): Promise<TenantBrandPackPatchResult> {
  const body = await call<TenantBrandPackPatchResult>(tenantPath(id), {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return { tenant_id: body.tenant_id, updated_fields: body.updated_fields, settings: body.settings };
}

export async function getTenantReadiness(id: string): Promise<TenantReadiness> {
  return call<TenantReadiness>(`${tenantPath(id)}/readiness`);
}

// ── Asset upload (raw body, real MIME type) ─────────────────────────────────

// Same base-URL logic as adminFetch (admin-api.ts), which does not export it.
const RAW_GATEWAY = (import.meta.env.VITE_GATEWAY_URL as string | undefined) || "";
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

export function isAllowedAssetMime(type: string): type is AllowedAssetMime {
  return (ALLOWED_ASSET_MIME as readonly string[]).includes(type);
}

export async function uploadTenantAsset(
  id: string,
  kind: AssetKind,
  file: File,
): Promise<TenantAssetUploadResult> {
  if (!(ASSET_KINDS as readonly string[]).includes(kind)) {
    throw new TenantProvisioningError("INVALID_ASSET_KIND", 0, { kind });
  }
  if (!isAllowedAssetMime(file.type)) {
    throw new TenantProvisioningError("UNSUPPORTED_TYPE", 0, {
      allowed: [...ALLOWED_ASSET_MIME],
      received: file.type,
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new TenantProvisioningError("NO_AUTH_TOKEN", 0);

  let res: Response;
  try {
    res = await fetch(`${GATEWAY_BASE}${tenantPath(id)}/assets/${kind}`, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: file,
    });
  } catch {
    throw new TenantProvisioningError("NETWORK_ERROR", 0);
  }

  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const code = typeof body?.error === "string" ? body.error : `HTTP_${res.status}`;
    throw new TenantProvisioningError(code, res.status, body ?? undefined);
  }
  return {
    path: String(body?.path ?? ""),
    mime_type: body?.mime_type as AllowedAssetMime,
    size_bytes: Number(body?.size_bytes ?? 0),
  };
}
