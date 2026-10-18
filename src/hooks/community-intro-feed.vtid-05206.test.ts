/**
 * VTID-05206 — the News Feed shows a "new member" card only for newcomers who
 * agreed to be introduced: both listings (All tab: useAllNewsFeed, Community
 * tab: useNewsFeed) ask the server for community_intro_opt_in = true, and the
 * All tab also skips any row that is not an explicit yes.
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

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => makeBuilder(t) } }));
vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k }));
vi.mock("@/lib/query-persist", () => ({ persistQueryCacheNow: vi.fn() }));

import { fetchNewsFeedCandidates } from "@/hooks/useAllNewsFeed";
import { fetchCommunityNews } from "@/hooks/useNewsFeed";

const row = (user_id: string, opt: unknown) => ({
  id: `gcp-${user_id}`, user_id, display_name: user_id, avatar_url: null, bio: null,
  created_at: "2026-10-15T08:00:00Z", community_intro_opt_in: opt,
});

describe("new-member cards follow the opt-in (VTID-05206)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    eqCalls.length = 0;
    for (const k of Object.keys(results)) delete results[k];
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({ ok: false } as Response);
  });
  afterEach(() => fetchSpy.mockRestore());

  it("All tab: the new-members query asks only for opted-in, visible members", async () => {
    await fetchNewsFeedCandidates("viewer-1", null);
    const gcp = eqCalls.filter((c) => c.table === "global_community_profiles");
    expect(gcp).toContainEqual({ table: "global_community_profiles", col: "community_intro_opt_in", val: true });
    expect(gcp).toContainEqual({ table: "global_community_profiles", col: "is_visible", val: true });
  });

  it("All tab: opted-in → card; opted-out or unknown → no card", async () => {
    results.global_community_profiles = {
      data: [row("yes", true), row("no", false), row("unknown", undefined), row("nulled", null)],
      error: null,
    };
    const { newMembers } = await fetchNewsFeedCandidates("viewer-1", null);
    expect(newMembers.map((m) => m.user_id)).toEqual(["yes"]);
  });

  it("Community tab: the new-members query asks only for opted-in, visible members", async () => {
    await fetchCommunityNews(10, null);
    const gcp = eqCalls.filter((c) => c.table === "global_community_profiles");
    expect(gcp).toContainEqual({ table: "global_community_profiles", col: "community_intro_opt_in", val: true });
    expect(gcp).toContainEqual({ table: "global_community_profiles", col: "is_visible", val: true });
  });

  it("a failed new-members read shows no card (never an unfiltered list)", async () => {
    results.global_community_profiles = { data: null, error: { message: "column community_intro_opt_in does not exist" } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { newMembers } = await fetchNewsFeedCandidates("viewer-1", null);
    expect(newMembers).toEqual([]);
    spy.mockRestore();
  });
});
