/**
 * useReleasesOverview — TanStack Query hook for the release matrix payload.
 *
 * Calls `GET /api/v1/releases/overview` on the gateway. Server returns
 * role-scoped data:
 *   - developer / Exafy super-admin → all platform components + all tenants
 *   - tenant_admin                 → platform components + own tenant only
 *   - other roles                  → 401/403 (caller should hide the surface)
 *
 * Used by:
 *   - src/pages/dev/DevReleases.tsx (Command Hub matrix, R5)
 *   - src/pages/admin/Releases.tsx (tenant admin Overview tab, R10 — Phase 4)
 *
 * Caching: stale-time 60s; refetch on window focus per spec.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReleasesOverview } from '@/types/releases';

const GATEWAY_URL = (import.meta as any).env?.VITE_GATEWAY_URL ?? '';

async function fetchReleasesOverview(): Promise<ReleasesOverview> {
  // The gateway expects the platform JWT in the Authorization header. We pull
  // the active session token from Supabase — same pattern other gateway
  // clients in this app use.
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token ?? null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GATEWAY_URL}/api/v1/releases/overview`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to load releases overview: ${response.status} ${body.slice(0, 200)}`
    );
  }

  const data = await response.json();
  // Gateway envelopes responses as `{ ok: true, ...payload }` — unwrap.
  if (data && typeof data === 'object' && 'platform' in data && 'tenants' in data) {
    return { platform: data.platform, tenants: data.tenants };
  }
  throw new Error('Unexpected response shape from /api/v1/releases/overview');
}

export function useReleasesOverview() {
  return useQuery<ReleasesOverview, Error>({
    queryKey: ['releases', 'overview'],
    queryFn: fetchReleasesOverview,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
