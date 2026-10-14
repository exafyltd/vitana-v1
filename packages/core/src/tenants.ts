/**
 * VTID-05183 — the tenant registry's pure half (generated extract of
 * src/lib/tenant-registry.ts, VTID-05151) and the retired-tenant mapping,
 * plus `tenantBrand(slug, registry)`, the brand colours the web applies as CSS
 * variables.
 *
 * The web no longer compiles its tenants in: the registry is data
 * (`list_public_tenants()`), and only COMPILED_MAXINA_FALLBACK is static — used
 * when the registry call fails. Fetching the registry is the caller's job
 * (it needs the Supabase client); this module only reads a registry it is given.
 */
import { FALLBACK_REGISTRY, findBySlug, safeHex, type TenantRegistry } from './extracted/tenants.generated';

export * from './extracted/tenants.generated';

/** Brand overlay; a colour the registry does not set stays undefined (the web then sets no variable). */
export interface TenantBrand {
  brandAccent?: string;
  brandBg?: string;
  brandFg?: string;
}

/**
 * Brand colours for a tenant slug, read from `registry` (default: the compiled
 * Maxina fallback, i.e. the registry the web uses when its call failed). A
 * retired slug maps to its successor. A slug the registry does not list is
 * neutral — `null`, never another tenant's brand — the same rule as the web
 * (src/lib/tenant-registry.ts `resolveActiveTenant` → `neutralTenant`, and
 * src/hooks/useTenant.tsx applies only validated hex values).
 */
export function tenantBrand(slug: string | null | undefined, registry: TenantRegistry = FALLBACK_REGISTRY): TenantBrand | null {
  const entry = findBySlug(registry, slug);
  if (!entry) return null;
  return { brandAccent: safeHex(entry.brand.accent), brandBg: safeHex(entry.brand.bg), brandFg: safeHex(entry.brand.fg) };
}
