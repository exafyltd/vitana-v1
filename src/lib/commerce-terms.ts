/**
 * VTID-04895 — the partner terms, as the supplier reads and accepts them.
 *
 * The gateway serves the version in force (GET /partner-onboarding/:orgId/terms):
 * the English text, which is binding (owner decision 2026-10-05), and a
 * translation in the supplier's language alongside when one exists. Accepting
 * sends back exactly the version and content hash that were shown, plus which
 * languages were on screen, so the record proves what was accepted. Only the
 * supplier's own session can accept — the gateway refuses an AI assistant's
 * delegated token.
 */
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ONBOARDING_API } from '@/lib/commerce-host';

export interface TermsText {
  title: string;
  body_md: string;
}

export interface PartnerTerms {
  id: string;
  version: string;
  published_at: string;
  content_sha256: string;
  binding_locale: string;
  binding: TermsText;
  translation: (TermsText & { locale: string }) | null;
  shown_locale: string;
}

export type TermsStatus =
  | { kind: 'not_published' }
  | { kind: 'pending'; terms: PartnerTerms; reacceptance: boolean }
  | { kind: 'accepted'; terms: PartnerTerms; acceptedAt: string | null };

/** Reads the gateway answer. Exported for tests. */
export function parseTermsStatus(body: unknown): TermsStatus {
  const b = (body ?? {}) as Record<string, any>;
  const t = b.terms as Record<string, any> | null | undefined;
  if (!b.published || !t || typeof t.version !== 'string' || typeof t.content_sha256 !== 'string') return { kind: 'not_published' };
  const terms: PartnerTerms = {
    id: String(t.id ?? ''),
    version: t.version,
    published_at: String(t.published_at ?? ''),
    content_sha256: t.content_sha256,
    binding_locale: String(t.binding_locale ?? 'en'),
    binding: { title: String(t.binding?.title ?? ''), body_md: String(t.binding?.body_md ?? '') },
    translation:
      t.translation && typeof t.translation.title === 'string'
        ? { locale: String(t.translation.locale), title: t.translation.title, body_md: String(t.translation.body_md ?? '') }
        : null,
    shown_locale: typeof t.shown_locale === 'string' ? t.shown_locale : 'en',
  };
  if (b.accepted) return { kind: 'accepted', terms, acceptedAt: typeof b.accepted_at === 'string' ? b.accepted_at : null };
  return { kind: 'pending', terms, reacceptance: b.reacceptance_required === true };
}

export async function fetchPartnerTerms(orgId: string, locale: string): Promise<TermsStatus> {
  const q = new URLSearchParams({ locale });
  return parseTermsStatus(await adminFetch(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/terms?${q.toString()}`));
}

/** The body the gateway needs: the exact version and text hash shown, and the languages on screen. */
export function acceptBody(terms: PartnerTerms) {
  return { terms_version: terms.version, content_sha256: terms.content_sha256, shown_locale: terms.shown_locale };
}

/** The terms changed while they were on screen: show the new text and ask again. */
export const isStaleTermsError = (e: unknown) =>
  e instanceof Error && /TERMS_(CONTENT|VERSION)_MISMATCH/.test(e.message);

export async function acceptPartnerTerms(orgId: string, terms: PartnerTerms): Promise<void> {
  await adminFetch(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/terms/accept`, {
    method: 'POST',
    body: JSON.stringify(acceptBody(terms)),
  });
}
