/**
 * VTID-05475 — setCommunityIntroOptIn records an explicit choice and is
 * backward-compatible with the migration not yet applied.
 *
 * It writes BOTH community_intro_opt_in and community_intro_choice_at. When the
 * marker column does not exist yet (PostgREST PGRST204 / Postgres 42703 naming
 * community_intro_choice_at) it retries ONCE writing only
 * community_intro_opt_in, so the Settings toggle and registration keep working
 * before the owner applies the migration (sparring R1-F1). Any other error is
 * thrown and NOT retried.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Each update() call returns the next queued result; records its payload.
const updates: Array<Record<string, unknown>> = [];
let results: Array<{ error: unknown }> = [];
let callIndex = 0;

function builder() {
  const b: Record<string, (...a: unknown[]) => unknown> = {
    update: (payload: Record<string, unknown>) => {
      updates.push(payload);
      return b;
    },
    eq: () => {
      const res = results[callIndex] ?? { error: null };
      callIndex++;
      return Promise.resolve(res);
    },
  };
  return b;
}

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => builder() } }));

import { setCommunityIntroOptIn } from "./community-intro";

beforeEach(() => {
  updates.length = 0;
  results = [];
  callIndex = 0;
});

describe("setCommunityIntroOptIn (VTID-05475)", () => {
  it("writes both community_intro_opt_in and community_intro_choice_at when the column exists", async () => {
    results = [{ error: null }];
    await setCommunityIntroOptIn("me", true);
    expect(updates).toHaveLength(1);
    expect(updates[0].community_intro_opt_in).toBe(true);
    expect(typeof updates[0].community_intro_choice_at).toBe("string");
    // a valid ISO timestamp
    expect(Number.isNaN(Date.parse(updates[0].community_intro_choice_at as string))).toBe(false);
  });

  it("writes false + marker for an explicit 'Not now'", async () => {
    results = [{ error: null }];
    await setCommunityIntroOptIn("me", false);
    expect(updates).toHaveLength(1);
    expect(updates[0].community_intro_opt_in).toBe(false);
    expect(typeof updates[0].community_intro_choice_at).toBe("string");
  });

  it("retries once with only community_intro_opt_in on a PGRST204 unknown-column error", async () => {
    results = [
      { error: { code: "PGRST204", message: "Could not find the 'community_intro_choice_at' column of 'global_community_profiles' in the schema cache" } },
      { error: null },
    ];
    await setCommunityIntroOptIn("me", true);
    expect(updates).toHaveLength(2);
    expect(updates[0]).toHaveProperty("community_intro_choice_at");
    // the retry writes ONLY the opt-in column, no marker
    expect(updates[1]).toEqual({ community_intro_opt_in: true });
  });

  it("retries once with only community_intro_opt_in on a 42703 unknown-column error", async () => {
    results = [
      { error: { code: "42703", message: 'column "community_intro_choice_at" does not exist' } },
      { error: null },
    ];
    await setCommunityIntroOptIn("me", false);
    expect(updates).toHaveLength(2);
    expect(updates[1]).toEqual({ community_intro_opt_in: false });
  });

  it("throws if the retry itself errors", async () => {
    results = [
      { error: { code: "42703", message: 'column "community_intro_choice_at" does not exist' } },
      { error: { code: "500", message: "server exploded" } },
    ];
    await expect(setCommunityIntroOptIn("me", true)).rejects.toMatchObject({ code: "500" });
    expect(updates).toHaveLength(2);
  });

  it("throws and does NOT retry on any other error code", async () => {
    results = [{ error: { code: "XXYYZ", message: "something unrelated" } }];
    await expect(setCommunityIntroOptIn("me", true)).rejects.toMatchObject({ code: "XXYYZ" });
    expect(updates).toHaveLength(1); // no retry
  });

  it("throws and does NOT retry on a PGRST204 that does not name the marker column", async () => {
    results = [{ error: { code: "PGRST204", message: "Could not find the 'some_other_column' column in the schema cache" } }];
    await expect(setCommunityIntroOptIn("me", true)).rejects.toMatchObject({ code: "PGRST204" });
    expect(updates).toHaveLength(1); // no retry: the error is not about community_intro_choice_at
  });
});
