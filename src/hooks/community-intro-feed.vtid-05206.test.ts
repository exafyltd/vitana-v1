/**
 * VTID-05206 / VTID-05478 — the News Feed shows a "new member" card only for
 * newcomers who agreed to be introduced. Both listings (All tab: useAllNewsFeed,
 * Community tab: useNewsFeed) now read GET /community/new-members through the
 * gateway, which applies the opt-in, visibility and exclusion filters server-side;
 * they never query global_community_profiles from the browser.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const eqCalls: Array<{ table: string; col: unknown; val: unknown }> = [];
const results: Record<string, { data: unknown; error: unknown }> = {};

type Settle = (v: unknown) => unknown;
type Builder = Record<string, (...a: never[]) => unknown>;
function makeBuilder(table: string) {
  const result = () => results[table] ?? { data: [], error: null };
  const b: Builder = {
    select: vi.fn(() => b),
    eq: vi.fn((col: unknown, val: unknown) => { eqCalls.push({ table, col, val }); return b; }),
    in: vi.fn(() => b),
    gte: vi.fn(() => b),
    is: vi.fn(() => b),
    order: vi.fn(() => b),
    limit: vi.fn(() => b),
    then: (res: Settle, rej: Settle) => Promise.resolve(result()).then(res, rej),
  };
  return b;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (t: string) => makeBuilder(t), auth: { getSession: async () => ({ data: { session: { access_token: "tok-session" } } }) } },
}));
vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k }));
vi.mock("@/lib/query-persist", () => ({ persistQueryCacheNow: vi.fn() }));

import { fetchNewsFeedCandidates } from "@/hooks/useAllNewsFeed";
import { fetchCommunityNews } from "@/hooks/useNewsFeed";

const row = (user_id: string, opt: unknown) => ({
  id: `gcp-${user_id}`, user_id, display_name: user_id, avatar_url: null, bio: null,
  created_at: "2026-10-15T08:00:00Z", community_intro_opt_in: opt,
});

const member = (user_id: string) => ({ user_id, display_name: user_id, avatar_url: null, bio: null, created_at: "2026-10-15T08:00:00Z" });
const gwUrl = (u: unknown) => String(u).includes("/community/new-members");

describe("new-member cards come from the gateway (VTID-05478)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let gateway: (url: string, init?: RequestInit) => Promise<Response>;
  beforeEach(() => {
    eqCalls.length = 0;
    for (const k of Object.keys(results)) delete results[k];
    gateway = async () => new Response(JSON.stringify({ ok: true, members: [] }), { status: 200 });
    fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url, init) =>
      gwUrl(url) ? gateway(String(url), init as RequestInit) : ({ ok: false } as Response));
  });
  afterEach(() => fetchSpy.mockRestore());

  const gatewayCalls = () => fetchSpy.mock.calls.filter(([u]) => gwUrl(u));

  it("All tab: asks the gateway with the member's bearer token and never reads global_community_profiles", async () => {
    await fetchNewsFeedCandidates("viewer-1", "tok-1");
    const calls = gatewayCalls();
    expect(calls).toHaveLength(1);
    expect(String(calls[0][0])).toMatch(/\/api\/v1\/community\/new-members\?limit=5$/);
    expect((calls[0][1] as RequestInit).headers).toEqual({ Authorization: "Bearer tok-1" });
    expect(eqCalls.filter((c) => c.table === "global_community_profiles")).toEqual([]);
  });

  it("Community tab: asks the gateway (token from the session) and never reads global_community_profiles", async () => {
    await fetchCommunityNews(10, null);
    const calls = gatewayCalls();
    expect(calls).toHaveLength(1);
    expect((calls[0][1] as RequestInit).headers).toEqual({ Authorization: "Bearer tok-session" });
    expect(eqCalls.filter((c) => c.table === "global_community_profiles")).toEqual([]);
  });

  it("All tab: members returned by the gateway become cards", async () => {
    gateway = async () => new Response(JSON.stringify({ ok: true, members: [member("yes"), member("viewer-1")] }), { status: 200 });
    const { newMembers } = await fetchNewsFeedCandidates("viewer-1", "tok-1");
    expect(newMembers.map((m) => m.user_id)).toEqual(["yes"]);
  });

  it("Community tab: members returned by the gateway become cards keyed by user id", async () => {
    gateway = async () => new Response(JSON.stringify({ ok: true, members: [member("yes")] }), { status: 200 });
    const articles = await fetchCommunityNews(10, null);
    const cards = articles.filter((a) => a.category === "member_spotlight");
    expect(cards.map((c) => [c.id, c.member_user_id])).toEqual([["member-yes", "yes"]]);
  });

  it.each([
    ["503 exclusion_lookup_failed", async () => new Response(JSON.stringify({ ok: false, error: "exclusion_lookup_failed" }), { status: 503 })],
    ["401", async () => new Response(JSON.stringify({ ok: false }), { status: 401 })],
    ["a network error", async () => { throw new TypeError("Failed to fetch"); }],
    ["a malformed body", async () => new Response("<html>", { status: 200 })],
  ])("a gateway failure (%s) shows no card and never falls back to the table", async (_n, impl) => {
    gateway = impl as typeof gateway;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const all = await fetchNewsFeedCandidates("viewer-1", "tok-1");
    const community = await fetchCommunityNews(10, null);
    expect(all.newMembers).toEqual([]);
    expect(community.filter((a) => a.category === "member_spotlight")).toEqual([]);
    expect(eqCalls.filter((c) => c.table === "global_community_profiles")).toEqual([]);
    spy.mockRestore();
  });

  it("without any token no request is sent and no card is shown", async () => {
    // Session has no token: simulate by asking the helper directly.
    const { fetchNewMembers } = await import("@/hooks/useNewMembersFeed");
    const { supabase } = await import("@/integrations/supabase/client");
    const orig = supabase.auth.getSession;
    (supabase.auth as { getSession: unknown }).getSession = async () => ({ data: { session: null } });
    expect(await fetchNewMembers(null)).toEqual([]);
    expect(gatewayCalls()).toHaveLength(0);
    (supabase.auth as { getSession: unknown }).getSession = orig;
  });
});
