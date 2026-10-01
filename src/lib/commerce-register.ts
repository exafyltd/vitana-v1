/**
 * VTID-04793 — the supplier registration call, without the form.
 *
 * Reuses `POST /api/v1/partner-orgs/register` unchanged. The endpoint still
 * requires an `org_key` (the business's short name) and answers 409
 * "org_key already taken" on a clash; a supplier should never have to invent
 * or fix one, so it is derived from the business name (`slugifyOrgKey`, the
 * same rule the form always used) and a clash is retried with a short random
 * suffix. Website and country go in the same call — the endpoint already
 * accepts and validates both.
 */
import { slugifyOrgKey } from '@/lib/commerce-host';

export const MAX_KEY_ATTEMPTS = 4;

/** "acme.com" → "https://acme.com"; blank stays blank; anything else is left for the gateway to judge. */
export function normalizeWebsite(input: string): string {
  const v = input.trim();
  if (!v) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
}

/** True when the value would pass the gateway's own check (http/https URL). */
export function isValidWebsite(input: string): boolean {
  const v = normalizeWebsite(input);
  if (!v) return true;
  try {
    const u = new URL(v);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).padEnd(4, '0');
}

/**
 * The short name to try on attempt `n` (0-based). A name with no Latin
 * letters (Arabic, Chinese, …) slugs to '', so it gets a neutral base.
 */
export function orgKeyCandidate(displayName: string, attempt: number, suffix = randomSuffix): string {
  const base = slugifyOrgKey(displayName) || 'business';
  if (attempt === 0 && base !== 'business') return base;
  return `${base.slice(0, 42).replace(/-+$/g, '')}-${suffix()}`;
}

export interface RegisterInput {
  displayName: string;
  category: string;
  commerceVertical: 'health' | 'general';
  website: string;
  country: string;
}

type Fetcher = (path: string, init: RequestInit) => Promise<any>;

/** Registers the business, retrying only on a short-name clash. Any other error is thrown as is. */
export async function registerBusiness(api: string, input: RegisterInput, fetcher: Fetcher, suffix = randomSuffix) {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_KEY_ATTEMPTS; attempt++) {
    const website = normalizeWebsite(input.website);
    try {
      return await fetcher(`${api}/register`, {
        method: 'POST',
        body: JSON.stringify({
          org_key: orgKeyCandidate(input.displayName, attempt, suffix),
          display_name: input.displayName.trim(),
          org_type: input.category,
          commerce_vertical: input.commerceVertical,
          country: input.country,
          ...(website ? { website } : {}),
        }),
      });
    } catch (err) {
      lastError = err;
      if (!(err instanceof Error && /already taken/i.test(err.message))) throw err;
    }
  }
  throw lastError;
}
