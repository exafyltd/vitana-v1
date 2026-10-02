/**
 * VTID-04836 — retired tenants.
 *
 * Platform migration 20260427120000_vtid_01985_earthlinks_to_maxina_cleanup
 * (exafyltd/vitana-platform) moved every Earthlinks member into Maxina and
 * deleted the `earthlinks` / `earthlings` tenants. The frontend no longer
 * knows them as tenants, but values can still reach it from outside:
 *
 *  - old links and bookmarks (/earthlinks, /earthlinks/confirmed?…),
 *  - a `tenant_slug` / `logout_tenant_slug` persisted in localStorage before
 *    the retirement,
 *  - `user_metadata.tenant_slug` written at sign-up, and record metadata
 *    (event / campaign `tenant_slug`).
 *
 * Every one of those resolves to the tenant that absorbed it, so an old value
 * lands on the Maxina portal instead of a blank page or a dead tenant lookup.
 */

/** Retired tenant slug → the tenant that absorbed its members. */
export const RETIRED_TENANT_SLUGS: Readonly<Record<string, string>> = Object.freeze({
  earthlinks: 'maxina',
  earthlings: 'maxina',
});

/** localStorage keys that hold a tenant slug. */
export const TENANT_SLUG_STORAGE_KEYS = ['tenant_slug', 'logout_tenant_slug'] as const;

/**
 * URL prefixes of retired tenant portals. They are still valid entry points
 * (old links), so route guards must let them through to the redirect route
 * instead of bouncing them to `/` first.
 */
export const RETIRED_TENANT_PATH_PREFIXES = ['/earthlinks'] as const;

/** Map a retired tenant slug to its successor; any other value is returned unchanged. */
export function canonicalTenantSlug(slug: string): string;
export function canonicalTenantSlug(slug: string | null | undefined): string | null;
export function canonicalTenantSlug(slug: string | null | undefined): string | null {
  if (!slug) return slug ?? null;
  return RETIRED_TENANT_SLUGS[slug.toLowerCase()] ?? slug;
}

/**
 * Where a retired-tenant URL now lives: `/earthlinks/x?y#z` → `/maxina/x?y#z`.
 * Returns null when the pathname does not belong to a retired tenant.
 */
export function retiredTenantRedirectPath(pathname: string, search = '', hash = ''): string | null {
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match) return null;
  const successor = RETIRED_TENANT_SLUGS[match[1].toLowerCase()];
  if (!successor) return null;
  const rest = match[2] && match[2] !== '/' ? match[2] : '';
  return `/${successor}${rest}${search}${hash}`;
}

/**
 * Read a persisted tenant slug, migrating a retired one in place so it is
 * rewritten once and every later read sees the successor. Never throws:
 * storage can be unavailable (private mode, blocked site data).
 */
export function readStoredTenantSlug(key: (typeof TENANT_SLUG_STORAGE_KEYS)[number] = 'tenant_slug'): string | null {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(key);
  } catch {
    return null;
  }
  const canonical = canonicalTenantSlug(stored);
  if (stored && canonical !== stored) {
    try {
      localStorage.setItem(key, canonical as string);
    } catch {
      // Storage became read-only; the canonical value is still returned.
    }
  }
  return canonical;
}

/** Migrate every persisted tenant slug once, at startup. */
export function migrateStoredTenantSlugs(): void {
  for (const key of TENANT_SLUG_STORAGE_KEYS) readStoredTenantSlug(key);
}
