/**
 * VTID-05209 — country and website Vitanaland can already suggest for a
 * business (saved values, VAT ID prefix, website country domain, the
 * supplier's confirmed business email). The gateway decides; this only asks.
 *
 * A suggestion is never saved by itself: the supplier sees it prefilled and
 * confirms with the screen's main button (Commerce UX contract, CLAUDE.md).
 * Any failure means "nothing to suggest", so the screens behave as before.
 */
import { PARTNER_ONBOARDING_API } from '@/lib/commerce-host';

export type CountrySource = 'stored' | 'vat_id' | 'website_domain' | 'email_domain';
export type WebsiteSource = 'stored' | 'email_domain';

export interface CompanySuggestions {
  country: { value: string; source: CountrySource } | null;
  website: { value: string; source: WebsiteSource } | null;
}

export const NO_SUGGESTIONS: CompanySuggestions = { country: null, website: null };

type Fetcher = (path: string, init?: RequestInit) => Promise<any>;

const COUNTRY_SOURCES: ReadonlySet<string> = new Set(['stored', 'vat_id', 'website_domain', 'email_domain']);

function parse(body: unknown): CompanySuggestions {
  const b = (body ?? {}) as { country?: any; website?: any };
  const country =
    b.country && typeof b.country.value === 'string' && /^[A-Z]{2}$/.test(b.country.value) && COUNTRY_SOURCES.has(b.country.source)
      ? { value: b.country.value as string, source: b.country.source as CountrySource }
      : null;
  const website =
    b.website && typeof b.website.value === 'string' && (b.website.source === 'stored' || b.website.source === 'email_domain')
      ? { value: b.website.value as string, source: b.website.source as WebsiteSource }
      : null;
  return { country, website };
}

/**
 * Suggestions for registration (no orgId) or for an existing business.
 * `website` is what the supplier has typed but not saved yet.
 */
export async function fetchCompanySuggestions(
  fetcher: Fetcher,
  opts: { orgId?: string | null; website?: string | null } = {},
): Promise<CompanySuggestions> {
  const q = opts.website?.trim() ? `?website=${encodeURIComponent(opts.website.trim())}` : '';
  const path = opts.orgId
    ? `${PARTNER_ONBOARDING_API}/${encodeURIComponent(opts.orgId)}/company-suggestions${q}`
    : `${PARTNER_ONBOARDING_API}/company-suggestions${q}`;
  try {
    return parse(await fetcher(path));
  } catch {
    return NO_SUGGESTIONS;
  }
}

/** The i18n key that says, in plain words, where a prefilled value came from. */
export function suggestionSourceKey(source: CountrySource | WebsiteSource): string | null {
  switch (source) {
    case 'email_domain':
      return 'screens.commerceportal.orgOnboarding.fromEmail';
    case 'website_domain':
      return 'screens.commerceportal.orgOnboarding.fromWebsite';
    case 'vat_id':
      return 'screens.commerceportal.orgOnboarding.fromVatId';
    default:
      return null;
  }
}
