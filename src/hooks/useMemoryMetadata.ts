import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGardenCategories, toUiCategory, type GardenCategorySummary } from "@/lib/memory-api";

export interface CategoryProgress {
  category: string;
  progress: number;
  memoryCount: number;
  avgConfidence: number;
  lastUpdated: string;
}

export interface MemoryMetadata {
  id: string;
  user_id: string;
  last_ai_sync_at: string | null;
  total_memories_count: number;
  category_progress: Record<string, CategoryProgress>;
  created_at: string;
  updated_at: string;
}

// Target memory counts per category for progress calculation
export const CATEGORY_TARGETS: Record<string, number> = {
  "personal-identity": 10,
  "health-wellness": 15,
  "lifestyle-routines": 12,
  "business-projects": 10,
  "network-relationships": 15,
  "learning-knowledge": 12,
  "finance-assets": 8,
  "location-environment": 8,
  "digital-footprint": 10,
  "values-aspirations": 10,
  "autopilot-settings": 5,
  "future-plans": 10,
  "general": 10,
};

/**
 * Progress for one category from its count. VTID-04389 (defect D5): the old
 * formula mixed a 0-100 "quality" term with ai_memory confidences on a 0-1
 * scale and grouped by ai_memory.memory_type (fact/insight/…) as if it were a
 * category, so most memories counted toward nothing. Progress is now the share
 * of the category target the user has actually reached.
 */
export function progressForCount(count: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.round(Math.min((count / target) * 100, 100));
}

export function metadataFromSummary(
  total: number,
  categories: GardenCategorySummary[],
): MemoryMetadata {
  const category_progress: Record<string, CategoryProgress> = {};
  let lastSync: string | null = null;
  for (const c of categories) {
    const ui = toUiCategory(c.category);
    const target = CATEGORY_TARGETS[ui] ?? 10;
    category_progress[ui] = {
      category: ui,
      progress: progressForCount(c.count, target),
      memoryCount: c.count,
      avgConfidence: 0,
      lastUpdated: c.last_updated_at ?? "",
    };
    if (c.last_updated_at && (!lastSync || c.last_updated_at > lastSync)) lastSync = c.last_updated_at;
  }
  const now = new Date().toISOString();
  return {
    id: "garden",
    user_id: "",
    last_ai_sync_at: lastSync,
    total_memories_count: total,
    category_progress,
    created_at: now,
    updated_at: now,
  };
}

/** Garden category counts, straight from the canonical memory store (VTID-04389). */
export function useMemoryMetadata() {
  const queryClient = useQueryClient();

  const { data: metadata, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["memory-metadata"],
    queryFn: async () => {
      const { total, categories } = await fetchGardenCategories();
      return metadataFromSummary(total, categories);
    },
  });

  return {
    metadata,
    isLoading,
    isError,
    refreshMetadata: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["knowledge-base"] }),
        refetch(),
      ]);
    },
    isRefreshing: isFetching && !isLoading,
    getCategoryProgress: (category: string): CategoryProgress | null => {
      if (!metadata?.category_progress) return null;
      return metadata.category_progress[category] || null;
    },
  };
}
