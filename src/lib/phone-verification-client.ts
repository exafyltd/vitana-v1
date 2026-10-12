/**
 * VTID-05096 — a member verifies their own phone number (gateway VTID-05095).
 *
 *   GET    /api/v1/me/phone                       status (enabled, verified, masked number)
 *   POST   /api/v1/me/phone/verification          { phone, region } → SMS code
 *   POST   /api/v1/me/phone/verification/confirm  { code }
 *   DELETE /api/v1/me/phone
 *
 * While the gateway switch is off, GET answers enabled:false and the app
 * shows no entry point at all.
 */

import { GATEWAY_BASE } from "@/lib/gateway-base";
import { getAccessToken } from "@/lib/cached-access-token";
import { phoneRegionHint } from "@/lib/connected-apps-client";

export interface PhoneStatus {
  enabled: boolean;
  verified: boolean;
  phone_masked: string | null;
  discoverable: boolean;
  resend_after_seconds: number;
}

/** Gateway error codes the app has a message for (anything else → "unknown"). */
export const PHONE_VERIFY_ERRORS = [
  "INVALID_PHONE",
  "NOT_A_MOBILE_NUMBER",
  "COUNTRY_NOT_SUPPORTED",
  "ACCOUNT_NOT_ELIGIBLE",
  "PHONE_IN_USE",
  "TOO_MANY_REQUESTS",
  "SMS_SEND_FAILED",
  "INVALID_CODE",
  "CODE_EXPIRED",
  "NO_PENDING_CODE",
  "TOO_MANY_ATTEMPTS",
] as const;
export type PhoneVerifyErrorCode = (typeof PHONE_VERIFY_ERRORS)[number] | "unknown";

export class PhoneVerifyRequestError extends Error {
  constructor(public status: number, public code: PhoneVerifyErrorCode) {
    super(code);
    this.name = "PhoneVerifyRequestError";
  }
}

export function errorCode(raw: unknown): PhoneVerifyErrorCode {
  return (PHONE_VERIFY_ERRORS as readonly string[]).includes(String(raw)) ? (raw as PhoneVerifyErrorCode) : "unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the gateway's JSON body, narrowed by each caller below
async function call(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const resp = await fetch(`${GATEWAY_BASE}/api/v1/me/phone${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json?.ok === false) throw new PhoneVerifyRequestError(resp.status, errorCode(json?.error));
  return json;
}

export async function fetchPhoneStatus(): Promise<PhoneStatus> {
  const json = await call("");
  return {
    enabled: json.enabled === true,
    verified: json.verified === true,
    phone_masked: typeof json.phone_masked === "string" ? json.phone_masked : null,
    discoverable: json.discoverable !== false,
    resend_after_seconds: Number.isFinite(json.resend_after_seconds) ? json.resend_after_seconds : 60,
  };
}

export async function sendPhoneCode(phone: string): Promise<{ phone_masked: string | null; resend_after_seconds: number }> {
  const json = await call("/verification", {
    method: "POST",
    body: JSON.stringify({ phone, region: phoneRegionHint() }),
  });
  return {
    phone_masked: typeof json.phone_masked === "string" ? json.phone_masked : null,
    resend_after_seconds: Number.isFinite(json.resend_after_seconds) ? json.resend_after_seconds : 60,
  };
}

export async function confirmPhoneCode(code: string): Promise<void> {
  await call("/verification/confirm", { method: "POST", body: JSON.stringify({ code }) });
}

export async function removeVerifiedPhone(): Promise<void> {
  await call("", { method: "DELETE" });
}

export const phoneStatusQueryKey = (userId: string | null | undefined) => ["phone-verification-status", userId ?? null];
