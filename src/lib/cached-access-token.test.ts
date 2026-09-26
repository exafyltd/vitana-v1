/**
 * VTID-04532 — the calendar gets its token without taking the auth lock.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (event: string, session: { access_token: string; expires_at?: number } | null) => void;
const h = vi.hoisted(() => ({ listener: null as null | Listener, getSession: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: h.getSession,
      onAuthStateChange: (cb: Listener) => {
        h.listener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

import { __resetAccessTokenCache, getAccessToken } from "./cached-access-token";

const nowS = () => Math.floor(Date.now() / 1000);

describe("getAccessToken (VTID-04532)", () => {
  beforeEach(() => {
    __resetAccessTokenCache();
    h.getSession.mockReset();
    h.getSession.mockResolvedValue({ data: { session: { access_token: "from-lock", expires_at: nowS() + 3600 } } });
  });

  it("subscribes once, at import", () => {
    expect(h.listener).toBeTypeOf("function");
  });

  it("uses the announced session without calling getSession()", async () => {
    h.listener!("INITIAL_SESSION", { access_token: "announced", expires_at: nowS() + 3600 });
    expect(await getAccessToken()).toBe("announced");
    expect(h.getSession).not.toHaveBeenCalled();
  });

  it("follows a refresh", async () => {
    h.listener!("INITIAL_SESSION", { access_token: "old", expires_at: nowS() + 3600 });
    h.listener!("TOKEN_REFRESHED", { access_token: "new", expires_at: nowS() + 3600 });
    expect(await getAccessToken()).toBe("new");
  });

  it("falls back to getSession() when nothing is known yet, then caches it", async () => {
    expect(await getAccessToken()).toBe("from-lock");
    expect(await getAccessToken()).toBe("from-lock");
    expect(h.getSession).toHaveBeenCalledTimes(1);
  });

  it("falls back to getSession() within a minute of expiry", async () => {
    h.listener!("INITIAL_SESSION", { access_token: "expiring", expires_at: nowS() + 30 });
    expect(await getAccessToken()).toBe("from-lock");
    expect(h.getSession).toHaveBeenCalledTimes(1);
  });

  it("returns null after sign-out when there is no session", async () => {
    h.listener!("SIGNED_OUT", null);
    h.getSession.mockResolvedValue({ data: { session: null } });
    expect(await getAccessToken()).toBeNull();
  });

  it("starts with the app, not with the first screen that needs it", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");
    expect(readFileSync(resolve(__dirname, "../main.tsx"), "utf8")).toContain("import './lib/cached-access-token'");
  });

  it("the calendar client no longer calls getSession() directly", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");
    const src = readFileSync(resolve(__dirname, "calendar-window-client.ts"), "utf8");
    expect(src).not.toContain("auth.getSession");
    expect(src).toContain("getAccessToken()");
  });
});
