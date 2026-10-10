/** VTID-05058 — invites open the member's own channel with their personal link. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/community-gateway", () => ({ communityFetch: fetchMock }));
const update = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (v: unknown) => {
        update(v);
        const q = { eq: () => q, then: (r: (x: unknown) => unknown) => r({ error: null }) };
        return q;
      },
    }),
  },
}));

import {
  availableChannels,
  fetchMyInviteLink,
  inviteUrl,
  markContactInvited,
  openInviteChannel,
  resetInviteLinkCache,
  whatsappNumber,
} from "./contact-invite-links";

beforeEach(() => {
  vi.clearAllMocks();
  resetInviteLinkCache();
});

describe("invite links", () => {
  const ana = { id: "c1", name: "Ana", phone: "0170 1234567", phoneE164: "+491701234567", email: "ana@example.com" };

  it("WhatsApp gets the international number, digits only", () => {
    expect(whatsappNumber(ana)).toBe("491701234567");
    expect(whatsappNumber({ id: "x", name: "x", phone: "0049 170 1" })).toBe("491701");
    expect(whatsappNumber({ id: "x", name: "x", phone: "0170 1" })).toBeNull(); // national, unknown country
    expect(inviteUrl("whatsapp", ana, "Hi & join: https://v/i/AB")).toBe(`https://wa.me/491701234567?text=${encodeURIComponent("Hi & join: https://v/i/AB")}`);
    expect(inviteUrl("whatsapp", { id: "x", name: "x", phone: "0170 1" }, "m")).toBe("https://wa.me/?text=m");
  });

  it("SMS and e-mail carry the message", () => {
    expect(inviteUrl("sms", ana, "a b")).toBe("sms:+491701234567?&body=a%20b");
    expect(inviteUrl("email", ana, "a b")).toBe("mailto:ana%40example.com?body=a%20b");
    expect(inviteUrl("share", ana, "x")).toBeNull();
  });

  it("offers only the channels that can reach the contact", () => {
    expect(availableChannels(ana)).toEqual(["whatsapp", "sms", "email", "share"]);
    expect(availableChannels({ id: "x", name: "x", email: "a@b.c" })).toEqual(["email", "share"]);
    expect(availableChannels({ id: "x", name: "x" })).toEqual(["share"]);
  });

  it("the personal link is fetched once and reused", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, code: "AB", url: "https://vitanaland.com/i/AB" }) });
    expect(await fetchMyInviteLink("u1")).toBe("https://vitanaland.com/i/AB");
    expect(await fetchMyInviteLink("u1")).toBe("https://vitanaland.com/i/AB");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/invites/me");
  });

  it("a failed link fetch is an error, never a link-less invite", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: "nope" }) });
    await expect(fetchMyInviteLink("u1")).rejects.toThrow("nope");
  });

  it("share: the native sheet; a cancelled sheet is not an invite", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    expect(await openInviteChannel("share", ana, "msg")).toBe(true);
    expect(share).toHaveBeenCalledWith({ text: "msg" });
    share.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "AbortError" }));
    expect(await openInviteChannel("share", ana, "msg")).toBe(false);
  });

  it("marking invited writes only invite_sent_at", async () => {
    await markContactInvited("u1", "c1");
    expect(Object.keys(update.mock.calls[0][0])).toEqual(["invite_sent_at"]);
  });
});
