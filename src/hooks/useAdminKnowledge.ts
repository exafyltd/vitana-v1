/**
 * Batch 1.B2: React Query hooks for the Knowledge admin section.
 *
 * Calls /api/v1/admin/tenants/:tenantId/kb/* on the gateway.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface KBDocument {
  id: string;
  tenant_id: string | null;
  source: string;
  title: string;
  body: string | null;
  status: string;
  indexed_at: string | null;
  embedding_id: string | null;
  topics: string[];
  visibility: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_baseline: boolean;
  is_opted_out: boolean;
}

export interface KBSearchResult {
  id: string;
  title: string;
  topics: string[];
  status: string;
  source: "tenant" | "baseline";
  rank: "high" | "low";
}

export function useKBDocuments(params: { source?: string; status?: string; q?: string } = {}) {
  const { activeTenantId } = useTenant();
  const { source, status, q } = params;
  return useQuery({
    queryKey: ["admin-kb-documents", activeTenantId, { source, status, q }],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const qs = new URLSearchParams();
      if (source) qs.set("source", source);
      if (status) qs.set("status", status);
      if (q) qs.set("q", q);
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/documents?${qs.toString()}`);
      return json.documents as KBDocument[];
    },
    enabled: !!activeTenantId,
  });
}

export function useKBDocument(id: string | null) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-kb-document", activeTenantId, id],
    queryFn: async () => {
      if (!activeTenantId || !id) return null;
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/documents/${id}`);
      return json.document as KBDocument;
    },
    enabled: !!activeTenantId && !!id,
  });
}

export function useCreateKBDocument() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: { title: string; body?: string; source?: string; topics?: string[] }) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/documents`, {
        method: "POST",
        body: JSON.stringify(doc),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kb-documents"] });
    },
  });
}

export function useDeleteKBDocument() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/documents/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kb-documents"] });
    },
  });
}

export function useReindexKBDocument() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/documents/${id}/reindex`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kb-documents"] });
    },
  });
}

export function useKBBaselineOptout() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, optOut }: { documentId: string; optOut: boolean }) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      if (optOut) {
        return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/baseline/${documentId}/optout`, { method: "POST" });
      } else {
        return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/baseline/${documentId}/optout`, { method: "DELETE" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kb-documents"] });
    },
  });
}

export function useKBSearch(query: string) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-kb-search", activeTenantId, query],
    queryFn: async () => {
      if (!activeTenantId || !query.trim()) return [];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/search?q=${encodeURIComponent(query)}`);
      return json.results as KBSearchResult[];
    },
    enabled: !!activeTenantId && query.trim().length > 0,
  });
}

export function useKBTopics() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-kb-topics", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/kb/topics`);
      return json.topics as string[];
    },
    enabled: !!activeTenantId,
  });
}
