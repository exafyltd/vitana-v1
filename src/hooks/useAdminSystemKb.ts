/**
 * Admin System KB — exafy_admin-only view of the system-wide knowledge_docs
 * table (where the Book of the Vitana Index and other vitana_system docs
 * live). Separate from tenant-scoped kb_documents handled by
 * useAdminKnowledge.
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";

export interface SystemKbDoc {
  id: string;
  title: string;
  path: string;
  tags: string[];
  source_type: string;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface SystemKbDocFull extends SystemKbDoc {
  content: string;
}

export function useSystemKbDocs(params: { path_prefix?: string; tag?: string; q?: string } = {}) {
  const { path_prefix, tag, q } = params;
  return useQuery({
    queryKey: ["admin-system-kb-docs", { path_prefix, tag, q }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (path_prefix) qs.set("path_prefix", path_prefix);
      if (tag) qs.set("tag", tag);
      if (q) qs.set("q", q);
      const json = await adminFetch(`/api/v1/admin/system-kb/docs?${qs.toString()}`);
      return (json.documents ?? []) as SystemKbDoc[];
    },
  });
}

export function useSystemKbDoc(id: string | null) {
  return useQuery({
    queryKey: ["admin-system-kb-doc", id],
    queryFn: async () => {
      if (!id) return null;
      const json = await adminFetch(`/api/v1/admin/system-kb/docs/${id}`);
      return json.document as SystemKbDocFull;
    },
    enabled: !!id,
  });
}
