/**
 * VTID-05058 — invite a contact to Maxina through the member's own channel.
 *
 * Vitanaland never messages someone who is not a member (gateway
 * `community-autopilot/invites.ts`). The member taps Invite, picks WhatsApp,
 * SMS, e-mail or the share sheet, and the app opens it with their personal
 * invite link (`GET /api/v1/invites/me` → `/i/<code>`) already in the text,
 * so a friend who joins is attributed to them. Only after the channel opened
 * is the contact marked invited.
 */

import { communityFetch } from "@/lib/community-gateway";
import { supabase } from "@/integrations/supabase/client";

export type InviteChannel = "whatsapp" | "sms" | "email" | "share";

export interface InviteTarget {
  id: string;
  name: string;
  /** International number (E.164) when the gateway could read one. */
  phoneE164?: string | null;
  phone?: string | null;
  email?: string | null;
}

let cachedLink: { userId: string; url: string } | null = null;

/** The member's one reusable invite link, fetched once per session. */
export async function fetchMyInviteLink(userId: string): Promise<string> {
  if (cachedLink?.userId === userId) return cachedLink.url;
  const resp = await communityFetch("/api/v1/invites/me");
  const json = (await resp.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
  if (!resp.ok || !json.ok || !json.url) throw new Error(json.error ?? "invite_link_unavailable");
  cachedLink = { userId, url: json.url };
  return json.url;
}

/** Test hook. */
export function resetInviteLinkCache(): void {
  cachedLink = null;
}

/** The digits wa.me needs ("+49 170 …" → "49170…"), or null without an international number. */
export function whatsappNumber(target: InviteTarget): string | null {
  const candidate = target.phoneE164 || target.phone || "";
  const trimmed = candidate.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/\D/g, "") || null;
  if (trimmed.startsWith("00")) return trimmed.replace(/\D/g, "").slice(2) || null;
  return null;
}

/** Which channels can reach this contact. Share always can. */
export function availableChannels(target: InviteTarget): InviteChannel[] {
  const out: InviteChannel[] = [];
  if (target.phone || target.phoneE164) out.push("whatsapp", "sms");
  if (target.email) out.push("email");
  out.push("share");
  return out;
}

/** The URL that opens the channel with the message filled in. Null for share. */
export function inviteUrl(channel: InviteChannel, target: InviteTarget, message: string): string | null {
  const text = encodeURIComponent(message);
  switch (channel) {
    case "whatsapp": {
      const n = whatsappNumber(target);
      return n ? `https://wa.me/${n}?text=${text}` : `https://wa.me/?text=${text}`;
    }
    case "sms": {
      const n = (target.phoneE164 || target.phone || "").replace(/[^\d+]/g, "");
      // "?&body=" is read by both iOS and Android messaging apps.
      return `sms:${n}?&body=${text}`;
    }
    case "email":
      return `mailto:${encodeURIComponent(target.email ?? "")}?body=${text}`;
    default:
      return null;
  }
}

/** Marks the contact invited (the member's own row; RLS keeps it theirs). */
export async function markContactInvited(userId: string, contactId: string): Promise<void> {
  const { error } = await supabase
    .from("contacts")
    .update({ invite_sent_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Opens the channel. Resolves true when it opened (or the share sheet
 * completed), false when the member cancelled the share sheet.
 */
export async function openInviteChannel(
  channel: InviteChannel,
  target: InviteTarget,
  message: string,
): Promise<boolean> {
  if (channel === "share") {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        // The message already carries the link; a separate url would show it twice.
        await nav.share({ text: message });
        return true;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return false;
        throw err;
      }
    }
    await nav?.clipboard?.writeText(message);
    return true;
  }
  const url = inviteUrl(channel, target, message);
  if (!url) return false;
  window.location.href = url;
  return true;
}
