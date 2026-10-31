/**
 * VTID-05221: tenant-provisioning-api — pins the request contract against
 * vitana-platform services/gateway/src/services/tenant-provisioning/schemas.ts
 * and routes/admin-tenants.ts. No network: fetch is stubbed, the Supabase
 * session is mocked, and the real adminFetch runs in between.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_GATEWAY_URL", "https://gateway.test/api/v1");
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok-123" } } }),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import {
  ALLOWED_ASSET_MIME,
  ASSET_KINDS,
  JEV_MONTHLY_BUDGET_MAX_USD,
  TENANT_SLUG_REGEX,
  TenantProvisioningError,
  errorI18nKey,
  getTenant,
  getTenantReadiness,
  listTenants,
  patchTenantBrandPack,
  provisionTenant,
  uploadTenantAsset,
  type ProvisionTenantInput,
  type TenantBrandPackPatch,
} from "./tenant-provisioning-api";
import deShard from "@/i18n/de/tenantProvisioning.json";
import enShard from "@/i18n/en/tenantProvisioning.json";

const BASE = "https://gateway.test/api/v1/admin/tenants";
const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: String(url), init: (init ?? {}) as RequestInit };
}

function headersOf(init: RequestInit): Record<string, string> {
  return init.headers as Record<string, string>;
}

async function caught(p: Promise<unknown>): Promise<TenantProvisioningError> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(TenantProvisioningError);
    return err as TenantProvisioningError;
  }
  throw new Error("expected a rejection");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("constants mirror schemas.ts / admin-tenants.ts", () => {
  it("asset kinds, MIME types and Jev budget cap", () => {
    expect([...ASSET_KINDS]).toEqual(["logo", "favicon", "og_image"]);
    expect([...ALLOWED_ASSET_MIME]).toEqual(["image/png", "image/jpeg", "image/webp"]);
    expect(JEV_MONTHLY_BUDGET_MAX_USD).toBe(500);
  });

  it("slug regex is byte-identical to SLUG_RE", () => {
    expect(TENANT_SLUG_REGEX.source).toBe("^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
    expect(TENANT_SLUG_REGEX.flags).toBe("");
    for (const ok of ["maxina", "club-77", "a1-b2-c3"]) expect(TENANT_SLUG_REGEX.test(ok)).toBe(true);
    for (const bad of ["1club", "Club", "a--b", "a-", "-a", "a_b"]) expect(TENANT_SLUG_REGEX.test(bad)).toBe(false);
  });
});

describe("JSON wrappers — URL, method, body", () => {
  it("listTenants GETs /api/v1/admin/tenants and unwraps tenants", async () => {
    const row = { id: "t1", name: "A", slug: "a", user_count: 0, status: "Empty", created_at: null, updated_at: null };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true, tenants: [row] }));
    await expect(listTenants()).resolves.toEqual([row]);
    const { url, init } = lastCall();
    expect(url).toBe(BASE);
    expect(init.method).toBeUndefined();
    expect(init.body).toBeUndefined();
    expect(headersOf(init).Authorization).toBe("Bearer tok-123");
  });

  it("getTenant GETs /:id (encoded) and unwraps tenant", async () => {
    const tenant = { id: "t 1", name: "A", slug: "a", user_count: 0, status: "Empty", members: [] };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true, tenant }));
    await expect(getTenant("t 1")).resolves.toEqual(tenant);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/t%201`);
    expect(init.method).toBeUndefined();
  });

  it("provisionTenant POSTs exactly the ProvisionTenantSchema body", async () => {
    const input: ProvisionTenantInput = {
      slug: "club-77",
      name: "Club 77",
      admin_email: "admin@example.com",
      all_members_group_name: "Alle Mitglieder",
      display_name: "Club 77 Longevity",
      jev_monthly_budget_usd: 25,
      default_locale: "de",
      enabled_locales: ["de", "en"],
      timezone: "Europe/Berlin",
      currency: "EUR",
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        ok: true,
        tenant_id: "tid-1",
        slug: "club-77",
        created: true,
        invitation: { id: "inv-1", expires_at: "2026-10-22T00:00:00Z", reused: false, accept_path: "/admin/invitations/accept/x" },
        ensured: { groups: 1 },
      }),
    );
    const out = await provisionTenant(input);
    const { url, init } = lastCall();
    expect(url).toBe(BASE);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(headersOf(init)["Content-Type"]).toBe("application/json");
    expect(out).toEqual({
      id: "tid-1",
      tenant_id: "tid-1",
      slug: "club-77",
      created: true,
      invitation: { id: "inv-1", expires_at: "2026-10-22T00:00:00Z", reused: false, accept_path: "/admin/invitations/accept/x" },
      ensured: { groups: 1 },
    });
  });

  it("provisionTenant sends only the required keys when optionals are absent", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true, tenant_id: "t", slug: "abc", created: false, invitation: {} }));
    await provisionTenant({ slug: "abc", name: "N", admin_email: "a@b.co", all_members_group_name: "G" });
    expect(Object.keys(JSON.parse(String(lastCall().init.body))).sort()).toEqual(
      ["admin_email", "all_members_group_name", "name", "slug"],
    );
  });

  it("patchTenantBrandPack PATCHes /:id with the brand pack incl. persona_facts and override_reason", async () => {
    const patch: TenantBrandPackPatch = {
      display_name: "Club 77",
      brand: { colors: { accent: "#112233", bg: "#000000", fg: "#FFFFFF" } },
      legal_entity_line: "Club 77 GmbH, Berlin",
      support_email: "help@example.com",
      sender_name: "Club 77",
      sender_email: "news@example.com",
      landing: { cta: "waitlist" },
      persona_facts: {
        community_name: "Club 77",
        anchor_person: { name: "Ana", role: "founder" },
        story_facts: ["founded 2020"],
        tone: ["warm"],
      },
      open_signup: true,
      override_reason: "owner approved early open",
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, tenant_id: "tid-1", updated_fields: ["display_name", "open_signup"], settings: { a: 1 } }),
    );
    const out = await patchTenantBrandPack("tid-1", patch);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/tid-1`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual(patch);
    expect(out).toEqual({ tenant_id: "tid-1", updated_fields: ["display_name", "open_signup"], settings: { a: 1 } });
  });

  it("getTenantReadiness GETs /:id/readiness and returns the response shape", async () => {
    const body = {
      ok: true,
      tenant_id: "tid-1",
      slug: "club-77",
      ready: false,
      legacy: false,
      schema_missing: false,
      checks: [
        { key: "brand_logo", ok: false, detail: "missing" },
        { key: "domain", ok: true, detail: "ok", informational: true },
      ],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, body));
    await expect(getTenantReadiness("tid-1")).resolves.toEqual(body);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/tid-1/readiness`);
    expect(init.method).toBeUndefined();
  });
});

describe("error mapping", () => {
  const P = "tenantProvisioning.errors.";
  const cases: Array<[string, number, string]> = [
    ["FORBIDDEN", 403, "FORBIDDEN"],
    ["NOT_EXAFY_ADMIN", 403, "NOT_EXAFY_ADMIN"],
    ["RESERVED_SLUG", 400, "RESERVED_SLUG"],
    ["SLUG_TAKEN", 409, "SLUG_TAKEN"],
    ["INVALID_SLUG", 400, "INVALID_SLUG"],
    ["INVALID_ADMIN_EMAIL", 400, "INVALID_ADMIN_EMAIL"],
    ["SERVICE_ACCOUNT_EMAIL", 400, "SERVICE_ACCOUNT_EMAIL"],
    ["INVALID_LOCALE", 400, "INVALID_LOCALE"],
    ["INVALID_TIMEZONE", 400, "INVALID_TIMEZONE"],
    ["INVALID_NAME", 400, "INVALID"],
    ["INVALID_PARAMS", 400, "INVALID"],
    ["INVALID_ASSET_PATH", 400, "INVALID"],
    ["INVALID_ASSET_KIND", 400, "INVALID"],
    ["INVALID_BODY", 400, "INVALID"],
    ["TENANT_NOT_READY", 409, "OVERRIDE_REASON_REQUIRED"],
    ["VALIDATION_FAILED", 400, "VALIDATION_FAILED"],
    ["TENANT_NOT_FOUND", 404, "TENANT_NOT_FOUND"],
    ["LEGACY_TENANT_READ_ONLY", 409, "LEGACY_TENANT_READ_ONLY"],
    ["UNAUTHENTICATED", 401, "UNAUTHENTICATED"],
    ["INVALID_TOKEN", 401, "UNAUTHENTICATED"],
    ["DB_UNAVAILABLE", 503, "UNAVAILABLE"],
    ["PROVISIONING_UNAVAILABLE", 503, "UNAVAILABLE"],
    ["INTERNAL_ERROR", 500, "UNKNOWN"],
  ];

  it.each(cases)("adminFetch %s → status %i, key %s", async (code, status, key) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(status, { ok: false, error: code }));
    const err = await caught(provisionTenant({ slug: "abc", name: "N", admin_email: "a@b.co", all_members_group_name: "G" }));
    expect(err.code).toBe(code);
    expect(err.status).toBe(status);
    expect(err.i18nKey).toBe(P + key);
  });

  it("403 FORBIDDEN (auth gate) and NOT_EXAFY_ADMIN (DB check) stay distinct", () => {
    expect(errorI18nKey("FORBIDDEN", 403)).toBe(`${P}FORBIDDEN`);
    expect(errorI18nKey("NOT_EXAFY_ADMIN", 403)).toBe(`${P}NOT_EXAFY_ADMIN`);
    expect(errorI18nKey("FORBIDDEN", 403)).not.toBe(errorI18nKey("NOT_EXAFY_ADMIN", 403));
  });

  it("status fallbacks: 415, 403, 401, 413, otherwise UNKNOWN", () => {
    expect(errorI18nKey("HTTP_415", 415)).toBe(`${P}UNSUPPORTED_MEDIA_TYPE`);
    expect(errorI18nKey("UNSUPPORTED_TYPE", 415)).toBe(`${P}UNSUPPORTED_MEDIA_TYPE`);
    expect(errorI18nKey("SOMETHING", 403)).toBe(`${P}FORBIDDEN`);
    expect(errorI18nKey("SOMETHING", 401)).toBe(`${P}UNAUTHENTICATED`);
    expect(errorI18nKey("SOMETHING", 413)).toBe(`${P}TOO_LARGE`);
    expect(errorI18nKey("SOMETHING", 500)).toBe(`${P}UNKNOWN`);
  });

  it("a body without an error code keeps the HTTP status", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 502 }));
    const err = await caught(listTenants());
    expect(err.code).toBe("HTTP_502");
    expect(err.status).toBe(502);
    expect(err.i18nKey).toBe(`${P}UNKNOWN`);
  });

  it("no session → NO_AUTH_TOKEN without a request", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null } } as never);
    const err = await caught(listTenants());
    expect(err.code).toBe("NO_AUTH_TOKEN");
    expect(err.i18nKey).toBe(`${P}UNAUTHENTICATED`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("network failure → NETWORK_ERROR, status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const err = await caught(getTenantReadiness("t"));
    expect(err.code).toBe("NETWORK_ERROR");
    expect(err.status).toBe(0);
    expect(err.i18nKey).toBe(`${P}UNKNOWN`);
  });

  it("every key the mapper can return exists in DE and EN", () => {
    const keys = new Set([...cases.map(([c, s]) => errorI18nKey(c, s)), `${P}UNSUPPORTED_MEDIA_TYPE`, `${P}TOO_LARGE`, `${P}INVALID`, `${P}UNKNOWN`]);
    const frag = {
      de: deShard.tenantProvisioning as { errors: Record<string, string> },
      en: enShard.tenantProvisioning as { errors: Record<string, string> },
    };
    for (const k of keys) {
      const leaf = k.slice(P.length);
      expect(frag.de.errors[leaf], `de ${leaf}`).toBeTruthy();
      expect(frag.en.errors[leaf], `en ${leaf}`).toBeTruthy();
    }
    expect(Object.keys(frag.de.errors).sort()).toEqual(Object.keys(frag.en.errors).sort());
    for (const text of Object.values(frag.de.errors)) expect(text).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen|Ihren|Ihrem|Ihrer)\b/);
  });
});

describe("uploadTenantAsset", () => {
  it("PUTs the raw File with its real MIME type (not JSON)", async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "logo.png", { type: "image/png" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, path: "club-77/logo.png", mime_type: "image/png", size_bytes: 4 }),
    );
    const out = await uploadTenantAsset("tid-1", "logo", file);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/tid-1/assets/logo`);
    expect(init.method).toBe("PUT");
    expect(headersOf(init)["Content-Type"]).toBe("image/png");
    expect(headersOf(init).Authorization).toBe("Bearer tok-123");
    expect(init.body).toBe(file);
    expect(out).toEqual({ path: "club-77/logo.png", mime_type: "image/png", size_bytes: 4 });
  });

  it.each([
    ["image/jpeg", "favicon"],
    ["image/webp", "og_image"],
  ] as const)("accepts %s for %s", async (type, kind) => {
    const file = new File([new Uint8Array([1])], "x", { type });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true, path: `s/${kind}`, mime_type: type, size_bytes: 1 }));
    await uploadTenantAsset("tid-1", kind, file);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/tid-1/assets/${kind}`);
    expect(headersOf(init)["Content-Type"]).toBe(type);
  });

  it.each(["image/gif", "image/svg+xml", ""])("rejects %j before any request", async (type) => {
    const file = new File(["<svg/>"], "x", { type });
    const err = await caught(uploadTenantAsset("tid-1", "logo", file));
    expect(err.code).toBe("UNSUPPORTED_TYPE");
    expect(err.i18nKey).toBe("tenantProvisioning.errors.UNSUPPORTED_MEDIA_TYPE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown asset kind before any request", async () => {
    const file = new File([new Uint8Array([1])], "x", { type: "image/png" });
    const err = await caught(uploadTenantAsset("tid-1", "banner" as never, file));
    expect(err.code).toBe("INVALID_ASSET_KIND");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a server 415 with its real status and body", async () => {
    const file = new File([new Uint8Array([1])], "x", { type: "image/png" });
    const body = { ok: false, error: "UNSUPPORTED_TYPE", allowed: ["image/png", "image/jpeg", "image/webp"] };
    fetchMock.mockResolvedValueOnce(jsonResponse(415, body));
    const err = await caught(uploadTenantAsset("tid-1", "logo", file));
    expect(err.status).toBe(415);
    expect(err.i18nKey).toBe("tenantProvisioning.errors.UNSUPPORTED_MEDIA_TYPE");
    expect(err.details).toEqual(body);
  });

  it("maps a server 403 FORBIDDEN and 413 TOO_LARGE", async () => {
    const file = new File([new Uint8Array([1])], "x", { type: "image/webp" });
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { ok: false, error: "FORBIDDEN" }));
    expect((await caught(uploadTenantAsset("t", "logo", file))).i18nKey).toBe("tenantProvisioning.errors.FORBIDDEN");
    fetchMock.mockResolvedValueOnce(jsonResponse(413, { ok: false, error: "TOO_LARGE" }));
    const tooLarge = await caught(uploadTenantAsset("t", "logo", file));
    expect(tooLarge.status).toBe(413);
    expect(tooLarge.i18nKey).toBe("tenantProvisioning.errors.TOO_LARGE");
  });

  it("no session → NO_AUTH_TOKEN without a request", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null } } as never);
    const file = new File([new Uint8Array([1])], "x", { type: "image/png" });
    const err = await caught(uploadTenantAsset("t", "logo", file));
    expect(err.code).toBe("NO_AUTH_TOKEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
