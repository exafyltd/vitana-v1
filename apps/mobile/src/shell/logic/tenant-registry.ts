/**
 * VTID-05186 — the registry lookups the shell needs that N1 does not export
 * (src/lib/tenant-registry.ts, VTID-05151): `tenantSlugFromPath`,
 * `isTenantPortalPath`, `tenantDisplayNameFor`. Pinned in
 * scripts/native/shell-pins.json; deleted if N1 re-exports them.
 */
import { RETIRED_TENANT_SLUGS, findBySlug, type TenantRegistry } from '../../ports/core';

export function tenantSlugFromPath(pathname: string, reg: TenantRegistry): string | null {
  const seg = pathname.split('?')[0].replace(/^\/+/, '').split('/')[0];
  if (!seg) return null;
  return findBySlug(reg, seg)?.slug ?? null;
}

export function isTenantPortalPath(pathname: string, reg: TenantRegistry): boolean {
  const seg = pathname.split('?')[0].replace(/^\/+/, '').split('/')[0].toLowerCase();
  if (!seg) return false;
  return seg in RETIRED_TENANT_SLUGS || !!findBySlug(reg, seg);
}

export function tenantDisplayNameFor(slug: string | null | undefined, reg: TenantRegistry): string {
  return findBySlug(reg, slug)?.display_name ?? '';
}
