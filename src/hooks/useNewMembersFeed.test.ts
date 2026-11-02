/**
 * VTID-05478 — fetchNewMembers: the one place the new-member card listing is read.
 * Fail safe: every failure is an empty list (no card), never a table fallback.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let sessionToken: string | null = "tok-session";
const fromSpy = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => fromSpy(...a),
    auth: { getSession: async () => ({ data: { session: sessionToken ? { access_token: sessionToken } : null } }) },
  },
}));

import { fetchNewMembers } from "./useNewMembersFeed";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const m = (id: string) => ({ user_id: id, display_name: id, avatar_url: null, bio: null, created_at: "2026-10-30T10:00:00Z" });

describe("fetchNewMembers", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    sessionToken = "tok-session";
    fromSpy.mockReset();
    fetchSpy = vi.spyOn(global, "fetch");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { fetchSpy.mockRestore(); vi.restoreAllMocks(); });

  it("calls the gateway route with limit 5 and the given bearer token", async () => {
    fetchSpy.mockResolvedValue(json({ ok: true, members: [m("a")] }));
    expect(await fetchNewMembers("tok-1")).toEqual([m("a")]);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/community\/new-members\?limit=5$/);
    expect((init as RequestInit).headers).toEqual({ Authorization: "Bearer tok-1" });
  });

  it("uses the session token when none is passed", async () => {
    fetchSpy.mockResolvedValue(json({ ok: true, members: [] }));
    await fetchNewMembers();
    expect(((fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>).Authorization).toBe("Bearer tok-session");
  });

  it("never reads the table", async () => {
    fetchSpy.mockResolvedValue(json({ ok: true, members: [m("a")] }));
    await fetchNewMembers("t");
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("returns [] with no token and sends nothing", async () => {
    sessionToken = null;
    expect(await fetchNewMembers(null)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["503", () => json({ ok: false, error: "exclusion_lookup_failed" }, 503)],
    ["401", () => json({ ok: false }, 401)],
    ["ok:false", () => json({ ok: false })],
    ["members not an array", () => json({ ok: true, members: "x" })],
    ["non-JSON body", () => new Response("<html>", { status: 200 })],
  ])("returns [] on %s", async (_n, make) => {
    fetchSpy.mockResolvedValue(make());
    expect(await fetchNewMembers("t")).toEqual([]);
  });

  it("returns [] on a network error or timeout", async () => {
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await fetchNewMembers("t")).toEqual([]);
    fetchSpy.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    expect(await fetchNewMembers("t")).toEqual([]);
  });

  it("drops rows without a user id", async () => {
    fetchSpy.mockResolvedValue(json({ ok: true, members: [m("a"), { ...m("x"), user_id: "" }] }));
    expect((await fetchNewMembers("t")).map((r) => r.user_id)).toEqual(["a"]);
  });
});
