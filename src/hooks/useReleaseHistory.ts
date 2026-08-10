/**
 * useReleaseHistory — TanStack Query hook for /api/v1/releases/history.
 *
 * Phase 4. Used by /admin/releases Changelog tab (R10) and DevReleases drawer.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReleaseHistoryEntry, ReleaseChannel } from '@/types/releases';

const GATEWAY_URL = (import.meta as any).env?.VITE_GATEWAY_URL ?? '';

interface Filters {
  componentId?: string;
  channel?: ReleaseChannel;
}

async function fetchReleaseHistory(filters: Filters): Promise<ReleaseHistoryEntry[]> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token ?? null;

  const params = new URLSearchParams();
  if (filters.componentId) params.set('component_id', filters.componentId);
  if (filters.channel) params.set('channel', filters.channel);
  const qs = params.toString();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(
    `${GATEWAY_URL}/api/v1/releases/history${qs ? `?${qs}` : ''}`,
    { headers, credentials: 'include' }
  );
  if (!r.ok) throw new Error(`Failed to load release history: ${r.status}`);
  const data = await r.json();
  return (data?.history ?? []) as ReleaseHistoryEntry[];
}

export function useReleaseHistory(filters: Filters = {}) {
  return useQuery<ReleaseHistoryEntry[], Error>({
    queryKey: ['releases', 'history', filters],
    queryFn: () => fetchReleaseHistory(filters),
    staleTime: 60_000,
  });
}
