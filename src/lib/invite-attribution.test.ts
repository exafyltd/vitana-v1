/**
 * VTID-04508 (Community Autopilot CA-7): the invite code survives sign-up and
 * is claimed exactly once.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/community-gateway", () => ({ communityFetch: vi.fn() }));

import { rememberInviteCode, readInviteCode, claimStoredInvite, clearInviteCode } from "./invite-attribution";

const ok = (body: unknown, status = 200) => ({ status, json: async () => body }) as unknown as Response;

describe("invite attribution", () => {
  beforeEach(() => clearInviteCode());

  it("keeps a valid code, rejects junk", () => {
    expect(rememberInviteCode("ABCD2345")).toBe(true);
    expect(readInviteCode()).toBe("abcd2345");
    expect(rememberInviteCode("<script>")).toBe(false);
  });

  it("a code older than 14 days is dropped", () => {
    rememberInviteCode("abcd2345", Date.now() - 15 * 86400_000);
    expect(readInviteCode()).toBeNull();
  });

  it("claims once, then clears the code", async () => {
    rememberInviteCode("abcd2345");
    const fetcher = vi.fn(async () => ok({ ok: true, status: "attributed" }));
    expect(await claimStoredInvite(fetcher as any)).toBe("attributed");
    expect(fetcher).toHaveBeenCalledWith("/api/v1/invites/claim", expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "abcd2345" }) }));
    expect(readInviteCode()).toBeNull();
    expect(await claimStoredInvite(fetcher as any)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("a server error keeps the code for the next sign-in", async () => {
    rememberInviteCode("abcd2345");
    const fetcher = vi.fn(async () => ok({}, 503));
    expect(await claimStoredInvite(fetcher as any)).toBeNull();
    expect(readInviteCode()).toBe("abcd2345");
  });
});
