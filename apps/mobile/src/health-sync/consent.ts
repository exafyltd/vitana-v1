/**
 * VTID-05184 — Vitana consent BEFORE any OS permission (N5a, plan change 6).
 *
 * requestOsPermission re-reads GET /api/v1/health/consents (never a cache) and
 * asks the OS only for categories with an active `sync_<category>` grant for
 * THIS member and THIS source. OS permission is device-wide, consent is per
 * member: a second member on the same phone gets nothing read until they
 * grant their own consent.
 */
import { CATEGORIES, CONSENT_KEY, entriesFor, type Category, type SyncPlatform } from './contract/v1/catalogue';
import type { SourceKind } from './contract/v1/wire';
import { PATHS, parseConsents, type ConsentsView, type GatewayClient } from './gateway';
import type { PlatformReader } from './readers/types';

export type GrantResult = { status: 'granted' } | { status: 'wording_changed' } | { status: 'unavailable' } | { status: 'error'; code: string };
export type RevokeResult = { status: 'revoked' } | { status: 'error'; code: string };
export type PermissionResult = { requested: Category[]; consent_required: Category[]; status: 'requested' | 'consent_required' | 'unavailable' };

export const GRANTED_VIA = 'native_health_sync';

export async function fetchConsents(gateway: GatewayClient): Promise<ConsentsView | null> {
  return parseConsents(await gateway.get(PATHS.consents));
}

/** Categories with an active grant for this member (the token's) and this source. */
export function grantedCategories(view: ConsentsView, kind: SourceKind): Set<Category> {
  const out = new Set<Category>();
  for (const cat of CATEGORIES) {
    if (view.consents.some((c) => c.category === CONSENT_KEY[cat] && c.resource_id === kind && c.active === true)) out.add(cat);
  }
  return out;
}

function errorCode(json: unknown): string {
  return json && typeof json === 'object' && typeof (json as { error?: unknown }).error === 'string' ? (json as { error: string }).error : 'UNKNOWN';
}

/**
 * The UI shows the released wording and passes the version and the locale it
 * displayed (C3 draft gate). Nothing local changes on failure.
 */
export async function grantConsent(gateway: GatewayClient, kind: SourceKind, category: Category, shown: { text_version: string; shown_locale: string }): Promise<GrantResult> {
  const view = await fetchConsents(gateway);
  if (!view) return { status: 'unavailable' };
  const cat = view.categories.find((c) => c.key === CONSENT_KEY[category]);
  if (!cat || cat.current_text_version !== shown.text_version) return { status: 'wording_changed' };
  const res = await gateway.postJson(PATHS.grant, {
    category: CONSENT_KEY[category],
    resource_id: kind,
    text_version: shown.text_version,
    locale: shown.shown_locale,
    granted_via: GRANTED_VIA,
  });
  if ('error' in res) return { status: 'unavailable' };
  if (res.status === 200) return { status: 'granted' };
  const code = errorCode(res.json);
  if (code === 'STALE_TEXT_VERSION') return { status: 'wording_changed' };
  if (code === 'CONSENT_STORE_PENDING' || code === 'DB_UNAVAILABLE' || res.status === 503) return { status: 'unavailable' };
  return { status: 'error', code };
}

/** Withdrawal always works (also with the flag off). */
export async function revokeConsent(gateway: GatewayClient, kind: SourceKind, category: Category, locale?: string): Promise<RevokeResult> {
  const body: Record<string, string> = { category: CONSENT_KEY[category], resource_id: kind };
  if (locale) body.locale = locale;
  const res = await gateway.postJson(PATHS.revoke, body);
  if ('error' in res) return { status: 'error', code: res.error };
  if (res.status === 200) return { status: 'revoked' };
  return { status: 'error', code: errorCode(res.json) };
}

/** OS permission only for freshly confirmed grants; read types only. */
export async function requestOsPermission(
  gateway: GatewayClient,
  reader: () => PlatformReader,
  platform: SyncPlatform,
  kind: SourceKind,
  categories: readonly Category[],
): Promise<PermissionResult> {
  const view = await fetchConsents(gateway);
  if (!view) return { requested: [], consent_required: [...categories], status: 'unavailable' };
  const granted = grantedCategories(view, kind);
  const requested = categories.filter((c) => granted.has(c));
  const consent_required = categories.filter((c) => !granted.has(c));
  if (requested.length === 0) return { requested, consent_required, status: 'consent_required' };
  await reader().requestRead(entriesFor(platform, requested), { history: true, background: true });
  return { requested, consent_required, status: 'requested' };
}
