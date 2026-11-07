/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — the
 * invite code a `/i/:code` link carries, kept on the device until sign-up.
 *
 * Native twin of the storage half of src/lib/invite-attribution.ts
 * (`rememberInviteCode` / `readInviteCode` / `clearInviteCode`: lower-cased,
 * `^[a-z0-9]{6,16}$`, 14-day expiry). The web module is class-B (its claim
 * imports the community gateway), so the pure part is re-implemented here,
 * not re-exported from `@vitana/core`. The claim itself (`POST
 * /api/v1/invites/claim` after sign-in, web InviteClaimer) is not part of this
 * read-only lane: nothing here makes a request or writes to a live system.
 */
export const INVITE_CODE_PATTERN = /^[a-z0-9]{6,16}$/;
export const INVITE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

let stored: { code: string; at: number } | null = null;

/** Normalises and keeps a valid code; false (nothing kept) for an invalid one. */
export function rememberInviteCode(code: string, now = Date.now()): boolean {
  const c = code.trim().toLowerCase();
  if (!INVITE_CODE_PATTERN.test(c)) return false;
  stored = { code: c, at: now };
  return true;
}

/** The kept code, or null when none / expired (an expired code is dropped). */
export function readInviteCode(now = Date.now()): string | null {
  if (!stored) return null;
  if (now - stored.at > INVITE_MAX_AGE_MS) {
    stored = null;
    return null;
  }
  return stored.code;
}

export function clearInviteCode(): void {
  stored = null;
}
