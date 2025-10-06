import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TimelineMemory {
  id: string;
  content: string;
  source: "ai" | "diary";
  memoryType?: string;
  sourceType?: string;
  tags?: string[];
  confidenceScore?: number;
  duration?: number;
  createdAt: string;
  metadata?: any;
}

const ITEMS_PER_PAGE = 20;

export function useMemoryTimeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch combined timeline
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ["memory-timeline"],
    queryFn: async ({ pageParam = 0 }) => {
      // Fetch AI memories
      const { data: aiMemories, error: aiError } = await supabase
        .from("ai_memory")
        .select("id, content, memory_type, confidence_score, metadata, created_at, updated_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

      if (aiError) throw aiError;

      // Fetch diary entries
      const { data: diaryEntries, error: diaryError } = await supabase
        .from("diary_entries")
        .select("id, text, source, tags, duration, created_at, updated_at")
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

      if (diaryError) throw diaryError;

      // Combine and sort
      const combined: TimelineMemory[] = [
        ...(aiMemories || []).map(m => ({
          id: m.id,
          content: m.content,
          source: "ai" as const,
          memoryType: m.memory_type,
          confidenceScore: m.confidence_score,
          createdAt: m.created_at,
          metadata: m.metadata
        })),
        ...(diaryEntries || []).map(d => ({
          id: d.id,
          content: d.text,
          source: "diary" as const,
          sourceType: d.source,
          tags: d.tags || [],
          duration: d.duration,
          createdAt: d.created_at
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        memories: combined,
        nextPage: combined.length === ITEMS_PER_PAGE ? pageParam + ITEMS_PER_PAGE : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "ai" | "diary" }) => {
      const table = source === "ai" ? "ai_memory" : "diary_entries";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-timeline"] });
      toast({
        title: "Memory Deleted",
        description: "The memory has been permanently removed."
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const allMemories = data?.pages.flatMap(page => page.memories) || [];

  return {
    memories: allMemories,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    deleteMemory: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending
  };
}
