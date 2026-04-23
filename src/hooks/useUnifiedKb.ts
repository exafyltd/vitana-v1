/**
 * React Query hooks for the unified Knowledge tree (system + baseline + tenant
 * scopes merged into one view). Backs the Documents tab.
 *
 * Endpoints (tenant-admin scope):
 *   GET /api/v1/admin/tenants/:tenantId/kb/unified-tree   — all 3 scopes grouped
 *   GET /api/v1/admin/tenants/:tenantId/kb/system-docs/:id — read-only system doc body
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/**
 * Edit a system-scope (knowledge_docs) document. Exafy-admin only — the gateway
 * enforces this. Changes apply immediately to the Vitana Assistant's
 * retrieval-router priority-100 grounding across all tenants.
 */
export function useEditSystemDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      content?: string;
      tags?: string[];
    }) => {
      const { id, ...body } = input;
      const json = await adminFetch(`/api/v1/admin/system-kb/docs/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      return json.document as UnifiedKbSystemDoc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kb-unified-system-doc"] });
      qc.invalidateQueries({ queryKey: ["admin-kb-unified-tree"] });
    },
  });
}

/**
 * Edit a baseline-scope (kb_documents WHERE tenant_id IS NULL) document.
 * Exafy-admin only. Changes apply to every tenant that hasn't opted out.
 */
export function useEditBaselineDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      body?: string;
      topics?: string[];
    }) => {
      const { id, ...body } = input;
      const json = await adminFetch(`/api/v1/admin/system-kb/baseline-docs/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      return json.document;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kb-document"] });
      qc.invalidateQueries({ queryKey: ["admin-kb-unified-tree"] });
      qc.invalidateQueries({ queryKey: ["admin-kb-documents"] });
    },
  });
}
