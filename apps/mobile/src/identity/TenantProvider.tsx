/**
 * VTID-05186 (N3, plan change 11) — native twin of src/hooks/useTenant.tsx.
 *
 * Active tenant: `app_metadata.active_tenant_id`, else the stored slug
 * (AsyncStorage `tenant_slug`; there is no URL slug on native). The tenant row
 * is read from `tenants` and merged with TENANT_CONFIGS (unknown → maxina).
 * `setTenantBySlug` = `switch_to_tenant_by_slug` → `auth.refreshSession()` →
 * local re-read → persist the slug (useTenant.tsx:169-240). `switching` stays
 * true until that resolves so the shell can hold its loader (plan change 10,
 * the Alkalma social sign-up). `setActiveTenant` (Exafy admin) is not ported.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { canonicalTenantSlug, TENANT_CONFIGS, type TenantConfig, type TenantType } from '../ports/core';
import { useAuth } from '../auth/AuthProvider';
import { getSupabase } from '../auth/client';
import { overlayBus } from '../navigation/overlay-bus';
import { deviceStorage, STORAGE_KEYS } from './device-storage';

export type Tenant = TenantConfig & { tenant_id?: string };

export type TenantValue = {
  activeTenantId: string | null;
  tenant: Tenant | null;
  /** The slug the shell can show before the tenant row arrives (stored slug). */
  storedSlug: string | null;
  isExafyAdmin: boolean;
  switching: boolean;
  setTenantBySlug: (slug: string) => Promise<void>;
};

const TenantContext = createContext<TenantValue | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, configMissing } = useAuth();
  const queryClient = useQueryClient();
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

  useEffect(() => {
    if (!user) return;
    const fromMeta = user.app_metadata?.active_tenant_id as string | undefined;
    if (fromMeta) {
      setActiveTenantId(fromMeta);
      return;
    }
    if (!storedSlug) return;
    const v = ++version.current;
    void (async () => {
      const { data } = await getSupabase().from('tenants').select('tenant_id').eq('slug', storedSlug).single();
      if (data && version.current === v) setActiveTenantId((data as { tenant_id: string }).tenant_id);
    })();
  }, [user, storedSlug]);

  const { data: tenantRow } = useQuery({
    queryKey: ['tenant', activeTenantId],
    queryFn: async () => {
      const { data, error } = await getSupabase().from('tenants').select('*').eq('tenant_id', activeTenantId).single();
      if (error) throw error;
      return data as { slug: string; tenant_id: string } & Record<string, unknown>;
    },
    enabled: !!activeTenantId && !configMissing,
  });

  const tenant = useMemo<Tenant | null>(() => {
    if (!tenantRow) return null;
    const brand = TENANT_CONFIGS[canonicalTenantSlug(tenantRow.slug) as TenantType] ?? TENANT_CONFIGS.maxina;
    return { ...(tenantRow as object), ...brand } as Tenant;
  }, [tenantRow]);

  const setTenantBySlug = useCallback(
    async (requested: string) => {
      if (!user) return;
      const slug = canonicalTenantSlug(requested);
      setSwitching(true);
      try {
        const supabase = getSupabase();
        let rpcOk = false;
        try {
          const { error } = await supabase.rpc('switch_to_tenant_by_slug', { p_tenant_slug: slug });
          rpcOk = !error;
        } catch {
          rpcOk = false;
        }
        if (rpcOk) {
          await sleep(100);
          await supabase.auth.refreshSession();
        }
        const { data } = await supabase.from('tenants').select('tenant_id, name').eq('slug', slug).single();
        if (data) {
          const id = (data as { tenant_id: string }).tenant_id;
          setActiveTenantId(id);
          await queryClient.invalidateQueries({ queryKey: ['tenant'] });
          await deviceStorage.setItem(STORAGE_KEYS.tenantSlug, slug);
          setStoredSlug(slug);
          overlayBus.emit('tenant.changed', { to: id, slug });
        }
      } finally {
        setSwitching(false);
      }
    },
    [user, queryClient],
  );

  const value = useMemo<TenantValue>(
    () => ({ activeTenantId, tenant, storedSlug, isExafyAdmin, switching, setTenantBySlug }),
    [activeTenantId, tenant, storedSlug, isExafyAdmin, switching, setTenantBySlug],
  );
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside <TenantProvider>');
  return ctx;
}
