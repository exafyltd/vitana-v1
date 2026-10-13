/**
 * VTID-05183 — tenant configs and retired-tenant mapping (generated extract)
 * plus `tenantBrand(slug)`, the brand colours the web applies as CSS variables.
 */
import { TENANT_CONFIGS, canonicalTenantSlug, type TenantConfig, type TenantType } from './extracted/tenants.generated';

export * from './extracted/tenants.generated';

export type TenantBrand = Pick<TenantConfig, 'brandAccent' | 'brandBg' | 'brandFg'>;

/**
 * Brand colours for a tenant slug. A retired slug maps to its successor, an
 * unknown slug falls back to maxina — the same fallback as the web
 * (src/hooks/useTenant.tsx: `TENANT_CONFIGS[canonicalTenantSlug(slug)] || TENANT_CONFIGS.maxina`).
 */
export function tenantBrand(slug: string | null | undefined): TenantBrand {
  const canonical = canonicalTenantSlug(slug ?? null);
  const config: TenantConfig = (canonical && TENANT_CONFIGS[canonical as TenantType]) || TENANT_CONFIGS.maxina;
  return { brandAccent: config.brandAccent, brandBg: config.brandBg, brandFg: config.brandFg };
}
