/**
 * VTID-05093 (Health Hub D10, WP2) — which consent wording the member sees,
 * and whether it may be granted at all.
 *
 * The consent wording is owner/counsel-supplied text, kept as versioned keys
 * `screens.settings.healthConsent.<category>.<version>.{title,body,checkbox}`
 * in every locale shard. `src/i18n/health-consent-texts.lock.json` says which
 * versions are released and pins the sha256 of each released text per locale
 * (the Vitest guard fails if a released text changes).
 *
 * THE DRAFT GATE: a version can be granted only if the lock manifest lists it
 * as `released` for the locale it is displayed in. Draft versions (status
 * `draft`, title starting with `[DRAFT]`) are never displayed and never
 * grantable — the app shows a "coming soon" note instead. Withdrawing an
 * existing consent never depends on this module.
 *
 * Locales without released wording show the released EN text (owner decision
 * at Gate 1, open question 3), then DE. The locale sent to the gateway is the
 * locale whose text was actually displayed — never the app locale by default.
 * Lookups read the locale's own catalogue directly (no silent DE fallback), so
 * "displayed in X" is always true.
 */
import lock from '@/i18n/health-consent-texts.lock.json';
import { catalogs } from '@/i18n';

export const HEALTH_CONSENT_CATEGORIES = [
  'wearables',
  'partner_results',
  'ai_health_analysis',
  'health_data_analytics',
  'community_insights',
] as const;
export type HealthConsentCategoryKey = (typeof HEALTH_CONSENT_CATEGORIES)[number];

/** Categories with one consent per partner / connector (resource_id required). */
export const PER_RESOURCE_CATEGORIES: ReadonlySet<HealthConsentCategoryKey> = new Set(['wearables', 'partner_results']);

/** The gateway's accepted locales (routes/health-consent.ts CONSENT_LOCALES). */
export const CONSENT_LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'] as const;
export type ConsentLocale = (typeof CONSENT_LOCALES)[number];

/** Short consent locale → catalogue tag in src/i18n/index.ts. */
export const CONSENT_LOCALE_TAGS: Record<ConsentLocale, string> = {
  ar: 'ar-XA',
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  pl: 'pl-PL',
  pt: 'pt-BR',
  ru: 'ru-RU',
  sr: 'sr-RS',
  tr: 'tr-TR',
  zh: 'zh-CN',
};

export const DRAFT_MARKER = '[DRAFT]';
export const WORDING_KEY_PREFIX = 'screens.settings.healthConsent';

export interface ConsentTexts {
  title: string;
  body: string;
  checkbox: string;
}

export interface LockVersionEntry {
  status: 'draft' | 'released';
  /** locale → sha256 hex of title + "\n" + body + "\n" + checkbox. */
  locales?: Partial<Record<ConsentLocale, string>>;
}

export interface ConsentLockManifest {
  texts: Partial<Record<string, Record<string, LockVersionEntry>>>;
}

export const HEALTH_CONSENT_LOCK = lock as ConsentLockManifest;

export type ResolvedWording =
  | { status: 'released'; locale: ConsentLocale; texts: ConsentTexts }
  | { status: 'draft' };

/** 'de-DE' → 'de'. Unknown tags fall back to 'de' (the app's default locale). */
export function toConsentLocale(appLocale: string): ConsentLocale {
  const short = String(appLocale || '').slice(0, 2).toLowerCase();
  return (CONSENT_LOCALES as readonly string[]).includes(short) ? (short as ConsentLocale) : 'de';
}

/** Raw (unparameterised) texts of one version in one catalogue; null if any part is missing. */
export function readConsentTexts(
  catalog: Record<string, unknown> | undefined,
  category: string,
  version: string,
): ConsentTexts | null {
  if (!catalog) return null;
  let node: unknown = catalog;
  for (const part of [...WORDING_KEY_PREFIX.split('.'), category, version]) {
    if (!node || typeof node !== 'object' || !(part in (node as Record<string, unknown>))) return null;
    node = (node as Record<string, unknown>)[part];
  }
  const v = node as Record<string, unknown>;
  if (typeof v?.title !== 'string' || typeof v?.body !== 'string' || typeof v?.checkbox !== 'string') return null;
  return { title: v.title, body: v.body, checkbox: v.checkbox };
}

function hasDraftMarker(texts: ConsentTexts): boolean {
  return [texts.title, texts.body, texts.checkbox].some((s) => s.includes(DRAFT_MARKER));
}

export function isVersionReleased(
  category: string,
  version: string,
  manifest: ConsentLockManifest = HEALTH_CONSENT_LOCK,
): boolean {
  return manifest.texts[category]?.[version]?.status === 'released';
}

/**
 * Pick the wording to display: the app locale if released there, else EN,
 * else DE — only ever a released version whose text is present in that
 * locale's own catalogue and carries no draft marker. Otherwise `draft`.
 */
export function resolveConsentWording(
  category: string,
  version: string | null | undefined,
  appLocale: string,
  manifest: ConsentLockManifest = HEALTH_CONSENT_LOCK,
  cats: Record<string, Record<string, unknown>> = catalogs,
): ResolvedWording {
  if (!version) return { status: 'draft' };
  const entry = manifest.texts[category]?.[version];
  if (!entry || entry.status !== 'released' || !entry.locales) return { status: 'draft' };
  const candidates = [...new Set<ConsentLocale>([toConsentLocale(appLocale), 'en', 'de'])];
  for (const loc of candidates) {
    if (!entry.locales[loc]) continue;
    const texts = readConsentTexts(cats[CONSENT_LOCALE_TAGS[loc]], category, version);
    if (texts && !hasDraftMarker(texts)) return { status: 'released', locale: loc, texts };
  }
  return { status: 'draft' };
}

/** Same `{param}` replacement as i18n-toast's lookup. */
export function fillConsentText(text: string, params?: Record<string, string>): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(v);
  return out;
}
