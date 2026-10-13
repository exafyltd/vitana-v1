/**
 * VTID-05186 (N3, plan change 3) — src/lib/tenant-display.ts (VTID-05151
 * registry version) with the stored slug and the registry injected (no
 * localStorage on native). Names come from the registry, never compiled in.
 * Pinned in scripts/native/shell-pins.json.
 */
import { tenantDisplayNameFor, tenantSlugFromPath, type TenantRegistry } from '../../ports/core';

export function getInstantTenantName(pathname: string, storedSlug: string | null, reg: TenantRegistry): string {
  const fromUrl = tenantSlugFromPath(pathname, reg);
  if (fromUrl) return tenantDisplayNameFor(fromUrl, reg);
  const name = tenantDisplayNameFor(storedSlug, reg);
  if (name) return name;
  return '';
}
