/** Synchronous tenant display name from URL or localStorage — no async needed */

const SLUG_TO_NAME: Record<string, string> = {
  maxina: 'Maxina',
  earthlinks: 'Earthlinks',
  alkalma: 'AlKalma',
};

export function getInstantTenantName(pathname: string): string {
  // 1. Try URL path
  for (const slug of Object.keys(SLUG_TO_NAME)) {
    if (pathname.startsWith(`/${slug}`)) return SLUG_TO_NAME[slug];
  }

  // 2. Try persisted slug from localStorage
  const stored = localStorage.getItem('tenant_slug');
  if (stored && SLUG_TO_NAME[stored]) return SLUG_TO_NAME[stored];

  // 3. Empty string — never show wrong brand
  return '';
}
