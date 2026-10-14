/**
 * VTID-05093 (Health Hub D10, WP2) — the member's health consents.
 *
 * Backed by the gateway's `routes/health-consent.ts` (VTID-05092), mounted at
 * `/api/v1/health/consents` (member JWT):
 *
 *   GET  /        → { ok, store_pending, categories, consents, partners, connectors }
 *   POST /grant   { category, resource_id?, text_version, locale, granted_via? }
 *   POST /revoke  { category, resource_id?, locale? }
 *
 * Same convention as `usePartnerLinkRequests.ts` (React Query + `adminFetch`,
 * explicit types). `adminFetch` throws `Error(body.error)`, so the gateway's
 * error code is the error message; `healthConsentErrorKey` maps it to copy.
 *
 * Consent never defaults to granted: anything that is not an active row from
 * the gateway reads as "not granted", and a failed load leaves every switch
 * off. Withdrawing an active consent is always offered (see consentAvailability).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-api';
import {
  HEALTH_SYNC_CONSENT_KEYS,
  PER_RESOURCE_CATEGORIES,
  PHONE_HEALTH_STORES,
  resolveConsentWording,
  type ConsentLocale,
  type HealthConsentCategoryKey,
  type HealthSyncConsentKey,
  type PhoneHealthStore,
} from '@/lib/health-consent-wording';

export const HEALTH_CONSENTS_API = '/api/v1/health/consents';
export const HEALTH_CONSENTS_KEY = ['health-consents'];

export type ConsentGrantedVia = 'settings_privacy' | 'settings_connected_apps' | 'partner_link_confirm';

export interface HealthConsentCategory {
  key: HealthConsentCategoryKey;
  resource_type: string;
  scope: string;
  per_resource: boolean;
  current_text_version: string;
  processing_active: boolean;
  sort: number;
}

export interface HealthConsentRow {
  category: HealthConsentCategoryKey;
  resource_id: string;
  active: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  granted_via: string | null;
  text_version: string | null;
  shown_locale: string | null;
}

export interface ConsentPartner {
  partner_key: string;
  display_name: string;
  status: string;
}

export interface ConsentConnector {
  id: string;
  display_name: string;
}

export interface HealthConsentsState {
  store_pending: boolean;
  categories: HealthConsentCategory[];
  consents: HealthConsentRow[];
  partners: ConsentPartner[];
  connectors: ConsentConnector[];
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export async function fetchHealthConsents(): Promise<HealthConsentsState> {
  const json = await adminFetch(HEALTH_CONSENTS_API);
  return {
    // Anything but an explicit `false` keeps the grant switches off.
    store_pending: json?.store_pending !== false,
    categories: arr<HealthConsentCategory>(json?.categories),
    consents: arr<HealthConsentRow>(json?.consents),
    partners: arr<ConsentPartner>(json?.partners),
    connectors: arr<ConsentConnector>(json?.connectors),
  };
}

export function useHealthConsents() {
  return useQuery({
    queryKey: HEALTH_CONSENTS_KEY,
    queryFn: fetchHealthConsents,
    // A pending migration or a missing route is not worth retrying; the
    // switches simply stay off.
    retry: false,
  });
}

/** The resource_id a consent is stored under: the key itself for whole-category consents. */
export function consentResourceId(category: HealthConsentCategoryKey, resourceId?: string | null): string | null {
  if (PER_RESOURCE_CATEGORIES.has(category)) return resourceId || null;
  return category;
}

/** The member's active consent row for a category (+ resource), or null. */
export function findActiveConsent(
  data: HealthConsentsState | undefined,
  category: HealthConsentCategoryKey,
  resourceId?: string | null,
): HealthConsentRow | null {
  if (!data) return null;
  const rid = consentResourceId(category, resourceId);
  if (!rid) return null;
  return data.consents.find((c) => c.category === category && c.resource_id === rid && c.active === true) ?? null;
}

export type ConsentAvailability =
  /** Loading — nothing can be changed yet. */
  | 'loading'
  /** The consents could not be loaded — off, nothing can be changed. */
  | 'unavailable'
  /** An active consent exists — it can always be withdrawn. */
  | 'active'
  /** Not granted; the gateway's store is not migrated yet (VTID-05092). */
  | 'store_pending'
  /** Not granted; the category is not in the gateway's catalogue. */
  | 'unknown_category'
  /** Not granted; the wording for the current version is not released (draft gate). */
  | 'draft'
  /** Not granted; may be granted with released wording. */
  | 'grantable';

export function consentAvailability(
  data: HealthConsentsState | undefined,
  state: { isLoading?: boolean; isError?: boolean },
  category: HealthConsentCategoryKey,
  resourceId: string | null | undefined,
  appLocale: string,
): ConsentAvailability {
  if (data && findActiveConsent(data, category, resourceId)) return 'active';
  if (state.isError) return 'unavailable';
  if (!data) return state.isLoading === false ? 'unavailable' : 'loading';
  if (data.store_pending) return 'store_pending';
  const cat = data.categories.find((c) => c.key === category);
  if (!cat) return 'unknown_category';
  if (resolveConsentWording(category, cat.current_text_version, appLocale).status !== 'released') return 'draft';
  return 'grantable';
}

export interface ConsentSource {
  category: Extract<HealthConsentCategoryKey, 'partner_results' | 'wearables' | HealthSyncConsentKey | 'self_logged_health'>;
  id: string;
  /** Partner / connector / phone-store display name; '' for the whole-category self-logged consent. */
  name: string;
}

const isListedCategory = (category: string): category is ConsentSource['category'] =>
  category === 'partner_results' ||
  category === 'wearables' ||
  category === 'self_logged_health' ||
  (HEALTH_SYNC_CONSENT_KEYS as readonly string[]).includes(category);

/**
 * Every partner + connector the gateway lists, plus any active consent for one it no longer lists.
 *
 * VTID-05166 (Health Hub Phase 1 / C3): the Health Sync consents are listed only once the
 * gateway's catalogue carries them (VTID-05164) — one row per `sync_*` category and phone
 * store, one row for `self_logged_health` — so a member can withdraw on the web what they
 * granted in the native app. An active consent is always listed, catalogue or not.
 * `phoneStoreName` turns a phone-store id into its display name (the UI passes an i18n lookup).
 */
export function listConsentSources(
  data: HealthConsentsState | undefined,
  phoneStoreName: (store: PhoneHealthStore) => string = (store) => store,
): ConsentSource[] {
  if (!data) return [];
  const inCatalogue = new Set(data.categories.map((c) => c.key));
  const connectorName = (id: string) =>
    (PHONE_HEALTH_STORES as readonly string[]).includes(id)
      ? phoneStoreName(id as PhoneHealthStore)
      : data.connectors.find((c) => c.id === id)?.display_name || id;
  const out: ConsentSource[] = [
    ...data.partners.map((p) => ({ category: 'partner_results' as const, id: p.partner_key, name: p.display_name || p.partner_key })),
    ...data.connectors.map((c) => ({ category: 'wearables' as const, id: c.id, name: c.display_name || c.id })),
  ];
  for (const key of HEALTH_SYNC_CONSENT_KEYS) {
    if (!inCatalogue.has(key)) continue;
    for (const store of PHONE_HEALTH_STORES) out.push({ category: key, id: store, name: phoneStoreName(store) });
  }
  if (inCatalogue.has('self_logged_health')) out.push({ category: 'self_logged_health', id: 'self_logged_health', name: '' });
  for (const c of data.consents) {
    if (!c.active || !isListedCategory(c.category)) continue;
    if (!out.some((s) => s.category === c.category && s.id === c.resource_id)) {
      let name = c.resource_id;
      if (c.category === 'self_logged_health') name = '';
      else if (c.category !== 'partner_results' && c.category !== 'wearables') name = connectorName(c.resource_id);
      out.push({ category: c.category, id: c.resource_id, name });
    }
  }
  return out;
}

/**
 * The partner to offer the optional consent for, or null. The link request
 * carries only the partner's display name, so the partner is used only when
 * exactly one listed partner has that name, and only when its consent is
 * grantable right now (not already active, store migrated, wording released).
 */
export function partnerConsentOffer(
  data: HealthConsentsState | undefined,
  partnerDisplayName: string | null | undefined,
  appLocale: string,
): ConsentPartner | null {
  if (!data || !partnerDisplayName) return null;
  const matches = data.partners.filter((p) => p.display_name === partnerDisplayName);
  if (matches.length !== 1) return null;
  const partner = matches[0];
  const availability = consentAvailability(data, { isLoading: false, isError: false }, 'partner_results', partner.partner_key, appLocale);
  return availability === 'grantable' ? partner : null;
}

export interface GrantHealthConsentBody {
  category: HealthConsentCategoryKey;
  resource_id?: string;
  text_version: string;
  locale: ConsentLocale;
  granted_via: ConsentGrantedVia;
}

export interface RevokeHealthConsentBody {
  category: HealthConsentCategoryKey;
  resource_id?: string;
  locale?: ConsentLocale;
}

function useConsentMutation<B>(action: 'grant' | 'revoke') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: B) =>
      adminFetch(`${HEALTH_CONSENTS_API}/${action}`, { method: 'POST', body: JSON.stringify(body) }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: HEALTH_CONSENTS_KEY });
    },
  });
}

export function useGrantHealthConsent() {
  return useConsentMutation<GrantHealthConsentBody>('grant');
}

export function useRevokeHealthConsent() {
  return useConsentMutation<RevokeHealthConsentBody>('revoke');
}

const ERROR_KEYS: Record<string, string> = {
  UNAUTHENTICATED: 'signIn',
  NO_AUTH_TOKEN: 'signIn',
  INVALID_REQUEST: 'invalidRequest',
  UNKNOWN_CATEGORY: 'unknownCategory',
  UNKNOWN_RESOURCE: 'unknownResource',
  STALE_TEXT_VERSION: 'staleText',
  CONSENT_STORE_PENDING: 'storePending',
  DB_UNAVAILABLE: 'unavailable',
  CONSENT_WRITE_FAILED: 'writeFailed',
};

/** Gateway error code (the thrown Error's message) → i18n toast key. */
export function healthConsentErrorKey(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err ?? '');
  return `screens.settings.healthConsentUi.errors.${ERROR_KEYS[code] ?? 'generic'}`;
}
