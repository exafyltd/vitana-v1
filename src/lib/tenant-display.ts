/** Synchronous tenant display name from URL or localStorage — no async needed */
import { readStoredTenantSlug } from './retired-tenants';
import { currentRegistrySync, tenantDisplayNameFor, tenantSlugFromPath } from './tenant-registry';

// VTID-05151: names come from the registry snapshot (written by
// useTenantRegistry), falling back to the compiled Maxina entry only when no
// snapshot exists yet. No tenant name is compiled in here any more.
export function getInstantTenantName(pathname: string): string {
  const reg = currentRegistrySync();

  // 1. Try URL path (first segment)
  const fromUrl = tenantSlugFromPath(pathname, reg);
  if (fromUrl) return tenantDisplayNameFor(fromUrl, reg);

  // 2. Try persisted slug from localStorage
  // A retired slug (VTID-04836: earthlinks) resolves to its successor.
  const stored = readStoredTenantSlug('tenant_slug');
  const name = tenantDisplayNameFor(stored, reg);
  if (name) return name;

  // 3. Empty string — never show wrong brand
  return '';
}
