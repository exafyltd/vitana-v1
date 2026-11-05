/**
 * VTID-05431 (Native Wave 2, settings lane) — every write the settings hub,
 * `/settings/limitations` and `/settings/tenant-role` make, as pure request
 * builders. The data hooks (`./hooks.ts`) send exactly these, so the unit
 * tests assert the built request (method, path, body) against a mocked
 * gateway / Supabase double and nothing is ever fired at a live backend
 * (requirements R5.2). Paths are gateway paths under `/api/v1` (the native
 * gateway fetch prepends it, `src/auth/gateway.ts`); each mirrors the web
 * client named on it.
 */

export type GatewayRequest = { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; body?: Record<string, unknown> };

/** `src/hooks/useNotifications.ts` `NotificationPreferences`. */
export type NotificationPreferences = {
  push_enabled: boolean;
  live_room_notifications: boolean;
  match_notifications: boolean;
  recommendation_notifications: boolean;
  task_notifications: boolean;
  community_notifications: boolean;
  memory_notifications: boolean;
  dnd_enabled: boolean;
  dnd_start_time: string | null;
  dnd_end_time: string | null;
};

/** `useNotifications.ts:33` DEFAULT_PREFS. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  push_enabled: true,
  live_room_notifications: true,
  match_notifications: true,
  recommendation_notifications: true,
  task_notifications: true,
  community_notifications: true,
  memory_notifications: false,
  dnd_enabled: false,
  dnd_start_time: null,
  dnd_end_time: null,
};

/** `useNotificationPreferences.updatePref` — the `user_notification_preferences` upsert row. */
export function notificationPrefsUpsert(userId: string, prefs: NotificationPreferences, nowIso: string) {
  return { table: 'user_notification_preferences', row: { user_id: userId, ...prefs, updated_at: nowIso }, options: { onConflict: 'user_id' } } as const;
}

/** `useNotificationCategoryPreferences` toggle — `PUT /notifications/category-preferences/:id`. */
export function categoryToggleRequest(categoryId: string, enabled: boolean): GatewayRequest {
  return { method: 'PUT', path: `/notifications/category-preferences/${encodeURIComponent(categoryId)}`, body: { enabled } };
}

/** `useCompanionPreferences` update — `PATCH /companion/preferences`. */
export function companionPatchRequest(patch: Partial<CompanionPreferences>): GatewayRequest {
  return { method: 'PATCH', path: '/companion/preferences', body: patch };
}

export type CompanionPreferences = { enabled: boolean; topic_health: boolean; topic_community: boolean; topic_business: boolean };

/** `src/lib/phone-verification-client.ts`. */
export function phoneSendCodeRequest(phone: string, region: string | undefined): GatewayRequest {
  return { method: 'POST', path: '/me/phone/verification', body: { phone, region } };
}
export function phoneConfirmRequest(code: string): GatewayRequest {
  return { method: 'POST', path: '/me/phone/verification/confirm', body: { code } };
}
export const PHONE_REMOVE_REQUEST: GatewayRequest = { method: 'DELETE', path: '/me/phone' };

/** `src/hooks/useAIConsent.ts` grant / revoke — the `user_preferences` update. */
export function aiConsentUpdate(granted: boolean, nowIso: string): { ai_data_consent_given: boolean; ai_data_consent_date: string | null } {
  return granted ? { ai_data_consent_given: true, ai_data_consent_date: nowIso } : { ai_data_consent_given: false, ai_data_consent_date: null };
}

/** `src/lib/billingApi.ts` `openBillingPortal` — `POST /billing/portal`. */
export const BILLING_PORTAL_REQUEST: GatewayRequest = { method: 'POST', path: '/billing/portal' };

/** `src/hooks/useCreator.ts` `useCreatorOnboard` — `POST /creators/onboard`. */
export function creatorOnboardRequest(returnUrl: string, refreshUrl: string): GatewayRequest {
  return { method: 'POST', path: '/creators/onboard', body: { return_url: returnUrl, refresh_url: refreshUrl } };
}

/** `src/pages/settings/Limitations.tsx` `save` — `PATCH /user/limitations` with the section's fields. */
export function limitationsPatchRequest(partial: Record<string, unknown>): GatewayRequest {
  return { method: 'PATCH', path: '/user/limitations', body: partial };
}

/** Only the gateway's known phone error codes get their own message (`phone-verification-client.ts:26`). */
export const PHONE_VERIFY_ERRORS = [
  'INVALID_PHONE',
  'NOT_A_MOBILE_NUMBER',
  'COUNTRY_NOT_SUPPORTED',
  'ACCOUNT_NOT_ELIGIBLE',
  'PHONE_IN_USE',
  'TOO_MANY_REQUESTS',
  'SMS_SEND_FAILED',
  'INVALID_CODE',
  'CODE_EXPIRED',
  'NO_PENDING_CODE',
  'TOO_MANY_ATTEMPTS',
] as const;
export type PhoneVerifyErrorCode = (typeof PHONE_VERIFY_ERRORS)[number] | 'unknown';

export function phoneErrorCode(raw: unknown): PhoneVerifyErrorCode {
  return (PHONE_VERIFY_ERRORS as readonly string[]).includes(String(raw)) ? (raw as PhoneVerifyErrorCode) : 'unknown';
}

/** `phoneRegionHint()` (connected-apps-client.ts:128) from a BCP-47 tag such as `de-DE`. */
export function phoneRegionHint(languageTag: string | null | undefined): string | undefined {
  const part = (languageTag ?? '').split(/[-_]/)[1];
  return part && /^[A-Za-z]{2}$/.test(part) ? part.toUpperCase() : undefined;
}

/** Stripe Connect links are opened only when they are Stripe's (useCreator.ts VTID-01230 check). */
export function isStripeConnectUrl(url: unknown): url is string {
  return typeof url === 'string' && url.startsWith('https://connect.stripe.com/');
}
