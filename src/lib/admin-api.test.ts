/**
 * VTID-05241 (mt-frontend-brand/adminfetch-header): adminFetch sends the
 * documented tenant/role context headers when known, and nothing extra when
 * not. Client-send only; this does not prove any gateway route reads them.
 * fetch is stubbed; nothing leaves the test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getSession = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

import { adminFetch } from "./admin-api";

function sessionWith(appMetadata: Record<string, unknown> | undefined) {
  return {
    data: {
      session: {
        access_token: "tok-123",
        user: { id: "u-1", app_metadata: appMetadata },
      },
    },
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

function sentHeaders(): Record<string, string> {
  const [, init] = fetchMock.mock.calls[0];
  return init.headers as Record<string, string>;
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetchMock);
  getSession.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminFetch context headers (VTID-05241)", () => {
  it("sends X-Vitana-Tenant from the session claim and X-Vitana-Active-Role from ctx", async () => {
    getSession.mockResolvedValue(sessionWith({ active_tenant_id: "tenant-1" }));
    await adminFetch("/admin/users", {}, { role: "admin" });
    const h = sentHeaders();
    expect(h["X-Vitana-Tenant"]).toBe("tenant-1");
    expect(h["X-Vitana-Active-Role"]).toBe("admin");
    expect(h.Authorization).toBe("Bearer tok-123");
    expect(h["Content-Type"]).toBe("application/json");
  });

  it("ctx.tenantId overrides the session claim", async () => {
    getSession.mockResolvedValue(sessionWith({ active_tenant_id: "tenant-1" }));
    await adminFetch("/admin/users", {}, { tenantId: "tenant-2" });
    expect(sentHeaders()["X-Vitana-Tenant"]).toBe("tenant-2");
  });

  it("sends neither header without a tenant or role (headers unchanged from before)", async () => {
    getSession.mockResolvedValue(sessionWith(undefined));
    await adminFetch("/admin/users");
    const h = sentHeaders();
    expect(h).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tok-123" });
    expect("X-Vitana-Tenant" in h).toBe(false);
    expect("X-Vitana-Active-Role" in h).toBe(false);
  });

  it("ignores empty tenant/role values", async () => {
    getSession.mockResolvedValue(sessionWith({ active_tenant_id: "" }));
    await adminFetch("/admin/users", {}, { tenantId: "  ", role: "" });
    const h = sentHeaders();
    expect("X-Vitana-Tenant" in h).toBe(false);
    expect("X-Vitana-Active-Role" in h).toBe(false);
  });

  it("does not send the role header from the tenant alone", async () => {
    getSession.mockResolvedValue(sessionWith({ active_tenant_id: "tenant-1" }));
    await adminFetch("/admin/users");
    const h = sentHeaders();
    expect(h["X-Vitana-Tenant"]).toBe("tenant-1");
    expect("X-Vitana-Active-Role" in h).toBe(false);
  });

  it("caller init.headers still win, Authorization unchanged", async () => {
    getSession.mockResolvedValue(sessionWith({ active_tenant_id: "tenant-1" }));
    await adminFetch("/admin/users", { headers: { "X-Vitana-Tenant": "explicit" } }, { role: "staff" });
    const h = sentHeaders();
    expect(h["X-Vitana-Tenant"]).toBe("explicit");
    expect(h["X-Vitana-Active-Role"]).toBe("staff");
    expect(h.Authorization).toBe("Bearer tok-123");
  });

  it("still throws NO_AUTH_TOKEN without a session and sends nothing", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(adminFetch("/admin/users")).rejects.toThrow("NO_AUTH_TOKEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
