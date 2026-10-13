/**
 * VTID-05186 (N3, plan change 3) — src/lib/tenant-display.ts with the stored
 * slug injected (no localStorage on native). Pinned in scripts/native/shell-pins.json.
 */
import { canonicalTenantSlug } from '../../ports/core';

export const SLUG_TO_NAME: Record<string, string> = {
  maxina: 'Maxina',
  alkalma: 'AlKalma',
};

export function getInstantTenantName(pathname: string, storedSlug: string | null): string {
  for (const slug of Object.keys(SLUG_TO_NAME)) {
    if (pathname.startsWith(`/${slug}`)) return SLUG_TO_NAME[slug];
  }
  const stored = canonicalTenantSlug(storedSlug);
  if (stored && SLUG_TO_NAME[stored]) return SLUG_TO_NAME[stored];
  return '';
}
