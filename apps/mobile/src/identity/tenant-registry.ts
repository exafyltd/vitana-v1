/**
 * VTID-05186 — the tenant registry on native (web: src/hooks/useTenantRegistry.ts,
 * src/lib/tenant-registry.ts, VTID-05151). `list_public_tenants` (a read, GET),
 * the last good list kept in AsyncStorage as the snapshot, and the compiled
 * Maxina fallback when neither exists. The pure lookups come from the core port.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { FALLBACK_REGISTRY, REGISTRY_SNAPSHOT_KEY, normalizeEntry, type TenantEntry, type TenantRegistry } from '../ports/core';
import { getSupabase } from '../auth/client';
import { deviceStorage } from './device-storage';

export const TENANT_REGISTRY_QUERY_KEY = ['tenant-registry', 'v1'] as const;

export async function fetchTenantRegistry(): Promise<TenantEntry[]> {
  const { data, error } = await getSupabase().rpc('list_public_tenants', undefined, { get: true });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map(normalizeEntry).filter((e): e is TenantEntry => !!e);
}

export async function readRegistrySnapshot(): Promise<TenantEntry[] | null> {
  try {
    const raw = await deviceStorage.getItem(REGISTRY_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tenants?: unknown[] };
    const tenants = Array.isArray(parsed?.tenants) ? parsed.tenants.map(normalizeEntry).filter((e): e is TenantEntry => !!e) : [];
    return tenants.length ? tenants : null;
  } catch {
    return null;
  }
}

async function loadTenantRegistry(): Promise<TenantRegistry> {
  const tenants = await fetchTenantRegistry();
  await deviceStorage.setItem(REGISTRY_SNAPSHOT_KEY, JSON.stringify({ at: Date.now(), tenants }));
  return { source: 'rpc', tenants };
}

export const tenantRegistryQueryOptions = {
  queryKey: TENANT_REGISTRY_QUERY_KEY,
  queryFn: loadTenantRegistry,
  staleTime: 10 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
} as const;

export async function ensureTenantRegistry(queryClient: QueryClient): Promise<TenantRegistry> {
  try {
    return await queryClient.ensureQueryData(tenantRegistryQueryOptions);
  } catch {
    const snap = await readRegistrySnapshot();
    return snap ? { source: 'snapshot', tenants: snap } : FALLBACK_REGISTRY;
  }
}

export function useTenantRegistry(enabled = true): TenantRegistry {
  const query = useQuery({ ...tenantRegistryQueryOptions, enabled });
  const [snapshot, setSnapshot] = useState<TenantEntry[] | null>(null);
  useEffect(() => {
    let active = true;
    void readRegistrySnapshot().then((s) => {
      if (active) setSnapshot(s);
    });
    return () => {
      active = false;
    };
  }, []);
  return useMemo<TenantRegistry>(() => {
    if (query.data) return query.data;
    if (snapshot) return { source: 'snapshot', tenants: snapshot };
    return FALLBACK_REGISTRY;
  }, [query.data, snapshot]);
}
