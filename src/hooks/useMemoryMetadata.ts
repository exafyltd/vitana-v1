import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function useMemoryMetadata() {
  const queryClient = useQueryClient();

  // Fetch memory metadata
  const { data: metadata, isLoading } = useQuery({
    queryKey: ["memory-metadata"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_memory_metadata")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      // Initialize if doesn't exist
      if (!data) {
        const { data: newMetadata, error: insertError } = await supabase
          .from("user_memory_metadata")
          .insert({
            user_id: user.id,
            total_memories_count: 0,
            category_progress: {} as any,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newMetadata as unknown as MemoryMetadata;
      }

      return data as unknown as MemoryMetadata;
    },
  });

  // Calculate progress for a category
  const calculateCategoryProgress = (
    memoryCount: number,
    avgConfidence: number,
    target: number
  ): number => {
    // 60% based on quantity (memories / target)
    const quantityScore = Math.min((memoryCount / target) * 100, 100);
    
    // 40% based on quality (avg confidence)
    const qualityScore = avgConfidence;
    
    // Combined score
    const totalScore = (quantityScore * 0.6) + (qualityScore * 0.4);
    
    return Math.round(Math.min(totalScore, 100));
  };

  // Refresh metadata by recalculating from ai_memory and diary_entries
  const refreshMetadataMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch all memories
      const { data: aiMemories, error: aiMemoriesError } = await supabase
        .from("ai_memory")
        .select("memory_type, confidence_score, created_at")
        .eq("user_id", user.id);

      if (aiMemoriesError) {
        console.error("[useMemoryMetadata] Error fetching ai_memory:", aiMemoriesError);
        throw aiMemoriesError;
      }

      const { data: diaryEntries, error: diaryEntriesError } = await supabase
        .from("diary_entries")
        .select("tags, created_at")
        .eq("user_id", user.id);

      if (diaryEntriesError) {
        console.error("[useMemoryMetadata] Error fetching diary_entries:", diaryEntriesError);
        throw diaryEntriesError;
      }

      // Calculate category progress
      const categoryProgress: Record<string, CategoryProgress> = {};
      
      // Group memories by category (simplified mapping)
      const categoryMemories: Record<string, { count: number; totalConfidence: number }> = {};
      
      aiMemories?.forEach((memory) => {
        const category = memory.memory_type || "personal-identity";
        if (!categoryMemories[category]) {
          categoryMemories[category] = { count: 0, totalConfidence: 0 };
        }
        categoryMemories[category].count++;
        categoryMemories[category].totalConfidence += memory.confidence_score || 50;
      });

      // Parse diary entry tags to extract categories
      diaryEntries?.forEach((entry) => {
        // Extract category from tags (first non-"diary" tag)
        const categoryTag = entry.tags?.find(tag => tag !== "diary" && tag !== "voice" && tag !== "photo") || "personal-identity";
        
        if (!categoryMemories[categoryTag]) {
          categoryMemories[categoryTag] = { count: 0, totalConfidence: 0 };
        }
        categoryMemories[categoryTag].count++;
        categoryMemories[categoryTag].totalConfidence += 50; // Default confidence for diary entries
      });

      // Calculate progress for each category
      Object.keys(CATEGORY_TARGETS).forEach((category) => {
        const memories = categoryMemories[category] || { count: 0, totalConfidence: 0 };
        const avgConfidence = memories.count > 0 
          ? memories.totalConfidence / memories.count 
          : 0;
        
        categoryProgress[category] = {
          category,
          progress: calculateCategoryProgress(
            memories.count,
            avgConfidence,
            CATEGORY_TARGETS[category]
          ),
          memoryCount: memories.count,
          avgConfidence: Math.round(avgConfidence),
          lastUpdated: new Date().toISOString(),
        };
      });

      // Update metadata
      const { data, error } = await supabase
        .from("user_memory_metadata")
        .update({
          category_progress: categoryProgress as any,
          total_memories_count: (aiMemories?.length || 0) + (diaryEntries?.length || 0),
          last_ai_sync_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MemoryMetadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-metadata"] });
    },
    onError: (error) => {
      console.error("[useMemoryMetadata] refreshMetadata failed, aborted before writing metadata:", error);
    },
  });

  return {
    metadata,
    isLoading,
    refreshMetadata: refreshMetadataMutation.mutate,
    isRefreshing: refreshMetadataMutation.isPending,
    getCategoryProgress: (category: string): CategoryProgress | null => {
      if (!metadata?.category_progress) return null;
      return metadata.category_progress[category] || null;
    },
  };
}
