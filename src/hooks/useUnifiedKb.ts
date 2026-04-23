/**
 * React Query hooks for the unified Knowledge tree (system + baseline + tenant
 * scopes merged into one view). Backs the Documents tab.
 *
 * Endpoints (tenant-admin scope):
 *   GET /api/v1/admin/tenants/:tenantId/kb/unified-tree   — all 3 scopes grouped
 *   GET /api/v1/admin/tenants/:tenantId/kb/system-docs/:id — read-only system doc body
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export type KbScope = "system" | "baseline" | "tenant";

export interface UnifiedKbDocEntry {
  id: string;
  title: string;
  path: string | null;
  source: KbScope;
  status: string;
  topics: string[];
  updated_at: string | null;
  created_at?: string | null;
  is_opted_out?: boolean;
}

export interface UnifiedKbGroup {
  group: string;
  docs: UnifiedKbDocEntry[];
}

export interface UnifiedKbTree {
  system: UnifiedKbGroup[];
  baseline: UnifiedKbGroup[];
  tenant: UnifiedKbGroup[];
}

export function useUnifiedKbTree() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-kb-unified-tree", activeTenantId],
    queryFn: async (): Promise<UnifiedKbTree> => {
      if (!activeTenantId) return { system: [], baseline: [], tenant: [] };
      const json = await adminFetch(
        `/api/v1/admin/tenants/${activeTenantId}/kb/unified-tree`,
      );
      return json.tree as UnifiedKbTree;
    },
    enabled: !!activeTenantId,
  });
}

export interface UnifiedKbSystemDoc {
  id: string;
  title: string;
  path: string;
  content: string;
  tags: string[];
  source_type: string | null;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

export function useUnifiedKbSystemDoc(id: string | null) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-kb-unified-system-doc", activeTenantId, id],
    queryFn: async (): Promise<UnifiedKbSystemDoc | null> => {
      if (!activeTenantId || !id) return null;
      const json = await adminFetch(
        `/api/v1/admin/tenants/${activeTenantId}/kb/system-docs/${id}`,
      );
      return json.document as UnifiedKbSystemDoc;
    },
    enabled: !!activeTenantId && !!id,
  });
}
