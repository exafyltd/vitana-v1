/**
 * VTID-05151 — the tenant registry as a React Query resource.
 *
 * One GET to `list_public_tenants()` per 10 minutes, kept for 24 h. On success
 * the result is written to the localStorage snapshot that the synchronous
 * callers (getInstantTenantName, resolveLoginRoute, AuthGuard) read.
 *
 * While the first fetch is in flight the snapshot stands in (source
 * 'snapshot'); without one, the compiled Maxina fallback does. A failed fetch
 * yields the compiled Maxina fallback (source 'fallback') and says so in the
 * console — it never switches silently.
 */
import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import {
  FALLBACK_REGISTRY,
  currentRegistrySync,
  fetchTenantRegistry,
  writeRegistrySnapshot,
  type TenantRegistry,
} from '@/lib/tenant-registry';

export const TENANT_REGISTRY_QUERY_KEY = ['tenant-registry', 'v1'] as const;

async function loadTenantRegistry(): Promise<TenantRegistry> {
  try {
    const tenants = await fetchTenantRegistry();
    writeRegistrySnapshot(tenants);
    return { source: 'rpc', tenants };
  } catch (err) {
    console.warn('[tenant-registry] fallback', err);
    throw err;
  }
}

export const tenantRegistryQueryOptions = {
  queryKey: TENANT_REGISTRY_QUERY_KEY,
  queryFn: loadTenantRegistry,
  staleTime: 10 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
} as const;

/** The registry for code that can await it (setTenantBySlug): fetched or cached, else the fallback. */
export async function ensureTenantRegistry(queryClient: QueryClient): Promise<TenantRegistry> {
  try {
    return await queryClient.ensureQueryData(tenantRegistryQueryOptions);
  } catch {
    return FALLBACK_REGISTRY;
  }
}

export function useTenantRegistry(): TenantRegistry & { isLoading: boolean } {
  const query = useQuery(tenantRegistryQueryOptions);
  const { data, isError, isLoading } = query;
  return useMemo(() => {
    const reg = data ?? (isError ? FALLBACK_REGISTRY : currentRegistrySync());
    return { source: reg.source, tenants: reg.tenants, isLoading };
  }, [data, isError, isLoading]);
}
