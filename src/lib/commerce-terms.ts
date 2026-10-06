/**
 * VTID-04895 — the partner terms, as the supplier reads and accepts them.
 * VTID-04909 — German is binding (owner decision 2026-10-06).
 *
 * The gateway serves the version in force (GET /partner-onboarding/:orgId/terms)
 * in one language at a time: the one asked for (the app language, or the one
 * the supplier switched to), German when that translation is missing. German
 * is the legally binding text; the content hash is the German text's, so it
 * is the same whichever language is on screen. Accepting sends back exactly
 * the version and that hash, plus the language that was on screen. Only the
 * supplier's own session can accept — the gateway refuses an AI assistant's
 * delegated token.
 */
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ONBOARDING_API } from '@/lib/commerce-host';

export interface TermsText {
  title: string;
  body_md: string;
}

/** The languages the partner terms can carry, in display order (exact BCP-47 codes). */
export const TERMS_LOCALES = ['de', 'en', 'es', 'sr', 'fr', 'pt-BR', 'ru', 'pl', 'ar', 'zh-CN', 'tr'] as const;

/**
 * Each language's own name for itself (endonyms). These are the same in every
 * UI language, so they are data, not catalog strings.
 */
export const TERMS_LANGUAGE_NAMES: Record<string, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  sr: 'Srpski',
  fr: 'Français',
  'pt-BR': 'Português (Brasil)',
  ru: 'Русский',
  pl: 'Polski',
  ar: 'العربية',
  'zh-CN': '简体中文',
  tr: 'Türkçe',
};

export const BINDING_TERMS_LOCALE = 'de';

export interface PartnerTerms {
  id: string;
  version: string;
  published_at: string;
  content_sha256: string;
  binding_locale: string;
  /** The binding German text. */
  binding: TermsText;
  /** The language on screen and its text. */
  locale: string;
  text: TermsText;
  direction: 'ltr' | 'rtl';
  /** The language asked for is missing, so German is shown. */
  fallback: boolean;
  /** The languages this version carries, in display order. */
  available_locales: string[];
  shown_locale: string;
}

export type TermsStatus =
  | { kind: 'not_published' }
  | { kind: 'pending'; terms: PartnerTerms; reacceptance: boolean }
  | { kind: 'accepted'; terms: PartnerTerms; acceptedAt: string | null };

const asText = (v: any): TermsText => ({ title: String(v?.title ?? ''), body_md: String(v?.body_md ?? '') });

/** Reads the gateway answer. Exported for tests. */
export function parseTermsStatus(body: unknown): TermsStatus {
  const b = (body ?? {}) as Record<string, any>;
  const t = b.terms as Record<string, any> | null | undefined;
  if (!b.published || !t || typeof t.version !== 'string' || typeof t.content_sha256 !== 'string') return { kind: 'not_published' };
  const binding = asText(t.binding);
  const locale = typeof t.locale === 'string' ? t.locale : typeof t.shown_locale === 'string' ? t.shown_locale : BINDING_TERMS_LOCALE;
  const available = Array.isArray(t.available_locales)
    ? (t.available_locales as unknown[]).filter((l): l is string => typeof l === 'string' && (TERMS_LOCALES as readonly string[]).includes(l))
    : [BINDING_TERMS_LOCALE];
  const terms: PartnerTerms = {
    id: String(t.id ?? ''),
    version: t.version,
    published_at: String(t.published_at ?? ''),
    content_sha256: t.content_sha256,
    binding_locale: String(t.binding_locale ?? BINDING_TERMS_LOCALE),
    binding,
    locale,
    text: t.text ? asText(t.text) : binding,
    direction: t.direction === 'rtl' ? 'rtl' : 'ltr',
    fallback: t.fallback === true,
    available_locales: available.length ? available : [BINDING_TERMS_LOCALE],
    shown_locale: typeof t.shown_locale === 'string' ? t.shown_locale : locale,
  };
  if (b.accepted) return { kind: 'accepted', terms, acceptedAt: typeof b.accepted_at === 'string' ? b.accepted_at : null };
  return { kind: 'pending', terms, reacceptance: b.reacceptance_required === true };
}

export async function fetchPartnerTerms(orgId: string, locale: string): Promise<TermsStatus> {
  const q = new URLSearchParams({ locale });
  return parseTermsStatus(await adminFetch(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/terms?${q.toString()}`));
}

/**
 * The body the gateway needs: the exact version and the binding (German)
 * text's hash, and the language that was on screen. Switching language never
 * changes the version or the hash.
 */
export function acceptBody(terms: PartnerTerms) {
  return { terms_version: terms.version, content_sha256: terms.content_sha256, shown_locale: terms.shown_locale };
}

/** The same legal version: switching language must not reset the tick. */
export const sameTermsVersion = (a: PartnerTerms | null, b: PartnerTerms | null) =>
  Boolean(a && b && a.id === b.id && a.version === b.version && a.content_sha256 === b.content_sha256);

/** The terms changed while they were on screen: show the new text and ask again. */
export const isStaleTermsError = (e: unknown) =>
  e instanceof Error && /TERMS_(CONTENT|VERSION)_MISMATCH/.test(e.message);

export async function acceptPartnerTerms(orgId: string, terms: PartnerTerms): Promise<void> {
  await adminFetch(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/terms/accept`, {
    method: 'POST',
    body: JSON.stringify(acceptBody(terms)),
  });
}

export type TermsBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'marker'; text: string }
  | { kind: 'item'; label: string; text: string }
  | { kind: 'paragraph'; text: string };

/**
 * The terms body as blocks to render as plain text (never HTML): `## ` lines
 * are headings, `a) …` lines list items, a line in capitals with no clause
 * number a review marker, everything else paragraphs (consecutive lines join).
 */
export function termsBlocks(body: string): TermsBlock[] {
  const out: TermsBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: 'paragraph', text: para.join(' ') });
    para = [];
  };
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const h = /^#{2,3}\s+(.*)$/.exec(line);
    if (h) {
      flush();
      out.push({ kind: 'heading', text: h[1] });
      continue;
    }
    const li = /^([a-z])\)\s+(.*)$/.exec(line);
    if (li) {
      flush();
      out.push({ kind: 'item', label: `${li[1]})`, text: li[2] });
      continue;
    }
    if (/^[A-Z][A-Z ]{12,}$/.test(line)) {
      flush();
      out.push({ kind: 'marker', text: line });
      continue;
    }
    para.push(line);
  }
  flush();
  return out;
}
