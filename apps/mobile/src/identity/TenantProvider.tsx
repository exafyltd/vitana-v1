/**
 * VTID-05186 (N3, plan change 11) — native twin of src/hooks/useTenant.tsx,
 * following the tenant registry (VTID-05151, origin/main 6346af150).
 *
 * Active tenant: `app_metadata.active_tenant_id`, else the stored slug
 * (AsyncStorage `tenant_slug`, only when the registry lists it; there is no
 * URL slug on native). The tenant is resolved from the registry
 * (`resolveActiveTenant`), with a `tenants` row read only when the registry
 * does not list the id. `setTenantBySlug` refuses a slug the registry does not
 * list, then `switch_to_tenant_by_slug` → `auth.refreshSession()` → the new id
 * → persist the slug, and reports `TenantSwitchResult` like the web.
 * `switching` stays true until that resolves so the shell holds its loader
 * (the Alkalma social sign-up, plan change 10). `setActiveTenant` (Exafy
 * admin) is not ported.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SLUG_RE, canonicalTenantSlug, findById, findBySlug, resolveActiveTenant, type ResolvedTenant, type TenantRegistry } from '../ports/core';
import { useAuth } from '../auth/AuthProvider';
import { getSupabase } from '../auth/client';
import { overlayBus } from '../navigation/overlay-bus';
import { deviceStorage, STORAGE_KEYS } from './device-storage';
import { ensureTenantRegistry, useTenantRegistry } from './tenant-registry';

export type Tenant = ResolvedTenant;

export type TenantSwitchResult =
  | { ok: true; tenantId: string }
  | { ok: false; code: 'not_signed_in' | 'unknown_tenant' | 'not_joinable' | 'rpc_failed'; message?: string };

export type TenantValue = {
  activeTenantId: string | null;
  tenant: Tenant | null;
  /** The stored slug (canonical), for the top bar before the tenant resolves. */
  storedSlug: string | null;
  registry: TenantRegistry;
  isExafyAdmin: boolean;
  switching: boolean;
  setTenantBySlug: (slug: string) => Promise<TenantSwitchResult>;
};

const TenantContext = createContext<TenantValue | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, configMissing } = useAuth();
  const queryClient = useQueryClient();
  const registry = useTenantRegistry(!configMissing);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [storedSlug, setStoredSlug] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const version = useRef(0);
  const isExafyAdmin = user?.app_metadata?.exafy_admin === true;

  useEffect(() => {
    let active = true;
    void Promise.resolve(deviceStorage.getItem(STORAGE_KEYS.tenantSlug)).then((raw) => {
      const slug = canonicalTenantSlug(raw ?? null);
      if (!active) return;
      setStoredSlug(slug);
      if (slug && raw && slug !== raw) void deviceStorage.setItem(STORAGE_KEYS.tenantSlug, slug);
    });
    return () => {
      active = false;
    };
  }, []);

  const registryKey = registry.tenants.map((t) => `${t.slug}:${t.tenant_id}`).join(',');
  useEffect(() => {
    if (!user) return;
    const fromMeta = user.app_metadata?.active_tenant_id as string | undefined;
    if (fromMeta) {
      setActiveTenantId(fromMeta);
      return;
    }
    const entry = findBySlug(registry, storedSlug);
    if (!entry) return;
    if (entry.tenant_id) {
      setActiveTenantId(entry.tenant_id);
      return;
    }
    const v = ++version.current;
    void (async () => {
      const { data } = await getSupabase().from('tenants').select('tenant_id').eq('slug', entry.slug).single();
      if (data && version.current === v) setActiveTenantId((data as { tenant_id: string }).tenant_id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registryKey stands for the registry
  }, [user, storedSlug, registryKey]);

  const listedById = !!findById(registry, activeTenantId);
  const { data: tenantRow } = useQuery({
    queryKey: ['tenant', activeTenantId],
    queryFn: async () => {
      const { data, error } = await getSupabase().from('tenants').select('tenant_id, slug, name').eq('tenant_id', activeTenantId).single();
      if (error) throw error;
      return data as { tenant_id: string; slug: string | null; name: string };
    },
    enabled: !!activeTenantId && !listedById && !configMissing,
  });

  const tenant = useMemo(() => resolveActiveTenant(activeTenantId, registry, tenantRow), [activeTenantId, registry, tenantRow]);

  const setTenantBySlug = useCallback(
    async (requested: string): Promise<TenantSwitchResult> => {
      if (!user) return { ok: false, code: 'not_signed_in' };
      const slug = canonicalTenantSlug(String(requested ?? '').trim().toLowerCase());
      if (!SLUG_RE.test(slug)) return { ok: false, code: 'unknown_tenant' };
      setSwitching(true);
      try {
        const reg = await ensureTenantRegistry(queryClient);
        const entry = findBySlug(reg, slug);
        if (!entry) return { ok: false, code: 'unknown_tenant' };
        const supabase = getSupabase();
        try {
          const { error } = await supabase.rpc('switch_to_tenant_by_slug', { p_tenant_slug: slug });
          if (error) return { ok: false, code: (error as { code?: string }).code === '42501' ? 'not_joinable' : 'rpc_failed', message: error.message };
        } catch (e) {
          return { ok: false, code: 'rpc_failed', message: (e as Error)?.message };
        }
        await sleep(100);
        const { data: refreshed } = await supabase.auth.refreshSession();
        const tenantId: string | undefined = refreshed?.session?.user?.app_metadata?.active_tenant_id || entry.tenant_id || undefined;
        if (!tenantId) return { ok: false, code: 'rpc_failed' };
        setActiveTenantId(tenantId);
        await queryClient.invalidateQueries({ queryKey: ['tenant'] });
        await deviceStorage.setItem(STORAGE_KEYS.tenantSlug, slug);
        setStoredSlug(slug);
        overlayBus.emit('tenant.changed', { to: tenantId, slug });
        return { ok: true, tenantId };
      } finally {
        setSwitching(false);
      }
    },
    [user, queryClient],
  );

  const value = useMemo<TenantValue>(
    () => ({ activeTenantId, tenant, storedSlug, registry, isExafyAdmin, switching, setTenantBySlug }),
    [activeTenantId, tenant, storedSlug, registry, isExafyAdmin, switching, setTenantBySlug],
  );
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside <TenantProvider>');
  return ctx;
}
