/**
 * VTID-04508 (Community Autopilot CA-7): carry a friend's invite code from the
 * `/i/<code>` landing through sign-up, then claim it once the new member is
 * signed in. The gateway decides whether the claim counts (new account, same
 * community, one referral per member) and whether the inviter is credited.
 */
import { communityFetch } from "@/lib/community-gateway";

const KEY = "vitana.invite_code";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
export const INVITE_CODE_PATTERN = /^[a-z0-9]{6,16}$/;

export function rememberInviteCode(code: string, now = Date.now()): boolean {
  const c = code.trim().toLowerCase();
  if (!INVITE_CODE_PATTERN.test(c)) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: c, at: now }));
    return true;
  } catch {
    return false;
  }
}

export function readInviteCode(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { code?: string; at?: number };
    if (!v.code || !INVITE_CODE_PATTERN.test(v.code) || typeof v.at !== "number" || now - v.at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return v.code;
  } catch {
    return null;
  }
}

export function clearInviteCode(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Terminal outcomes clear the stored code; a network error keeps it for the next sign-in. */
export async function claimStoredInvite(fetcher: typeof communityFetch = communityFetch): Promise<string | null> {
  const code = readInviteCode();
  if (!code) return null;
  try {
    const resp = await fetcher("/api/v1/invites/claim", { method: "POST", body: JSON.stringify({ code }) });
    if (resp.status >= 500) return null;
    const json = (await resp.json().catch(() => ({}))) as { status?: string };
    clearInviteCode();
    return json.status ?? "done";
  } catch {
    return null;
  }
}
