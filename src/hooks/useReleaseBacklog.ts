/**
 * useReleaseBacklog — TanStack Query hook for /api/v1/releases/backlog.
 *
 * Phase 4. Used by /admin/releases Backlog tab (R10) and DevReleases drawer.
 * Per P1: items with `vtid_linked=true` show `effective_status` from vtid_ledger
 * (read-only — the UI must disable status edits for these rows).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BacklogItem } from '@/types/releases';

const GATEWAY_URL = (import.meta as any).env?.VITE_GATEWAY_URL ?? '';

interface Filters {
  componentId?: string;
  status?: string;
}

async function fetchBacklog(filters: Filters): Promise<BacklogItem[]> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token ?? null;

  const params = new URLSearchParams();
  if (filters.componentId) params.set('component_id', filters.componentId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(
    `${GATEWAY_URL}/api/v1/releases/backlog${qs ? `?${qs}` : ''}`,
    { headers, credentials: 'include' }
  );
  if (!r.ok) throw new Error(`Failed to load backlog: ${r.status}`);
  const data = await r.json();
  return (data?.items ?? []) as BacklogItem[];
}

export function useReleaseBacklog(filters: Filters = {}) {
  return useQuery<BacklogItem[], Error>({
    queryKey: ['releases', 'backlog', filters],
    queryFn: () => fetchBacklog(filters),
    staleTime: 30_000,
  });
}
