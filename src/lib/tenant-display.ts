/** Synchronous tenant display name from URL or localStorage — no async needed */
import { readStoredTenantSlug } from './retired-tenants';

const SLUG_TO_NAME: Record<string, string> = {
  maxina: 'Maxina',
  alkalma: 'AlKalma',
};

export function getInstantTenantName(pathname: string): string {
  // 1. Try URL path
  for (const slug of Object.keys(SLUG_TO_NAME)) {
    if (pathname.startsWith(`/${slug}`)) return SLUG_TO_NAME[slug];
  }

  // 2. Try persisted slug from localStorage
  // A retired slug (VTID-04836: earthlinks) resolves to its successor.
  const stored = readStoredTenantSlug('tenant_slug');
  if (stored && SLUG_TO_NAME[stored]) return SLUG_TO_NAME[stored];

  // 3. Empty string — never show wrong brand
  return '';
}
