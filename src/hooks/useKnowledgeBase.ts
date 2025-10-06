import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface KnowledgeItem {
  id: string;
  content: string;
  source: "ai" | "diary";
  memoryType?: string;
  tags?: string[];
  confidenceScore?: number;
  duration?: number;
  createdAt: string;
  metadata?: any;
}

const ITEMS_PER_PAGE = 20;

export function useKnowledgeBase(filter: "all" | "insights" | "diary" = "all") {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["knowledge-base", filter],
    queryFn: async ({ pageParam = 0 }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const userId = session.session.user.id;
      const items: KnowledgeItem[] = [];

      // Fetch from ai_memory (curated knowledge only)
      if (filter === "all" || filter === "insights") {
        const { data: aiMemories, error: aiError } = await supabase
          .from("ai_memory")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true) // Only active knowledge
          .gte("confidence_score", 0.7) // Only high-confidence items
          .order("created_at", { ascending: false })
          .range(pageParam * ITEMS_PER_PAGE, (pageParam + 1) * ITEMS_PER_PAGE - 1);

        if (aiError) throw aiError;

        items.push(
          ...(aiMemories || []).map((mem) => ({
            id: mem.id,
            content: mem.content,
            source: "ai" as const,
            memoryType: mem.memory_type,
            confidenceScore: mem.confidence_score,
            createdAt: mem.created_at,
            metadata: mem.metadata,
          }))
        );
      }

      // Fetch from diary_entries (user's personal knowledge)
      if (filter === "all" || filter === "diary") {
        const { data: diaryEntries, error: diaryError } = await supabase
          .from("diary_entries")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(pageParam * ITEMS_PER_PAGE, (pageParam + 1) * ITEMS_PER_PAGE - 1);

        if (diaryError) throw diaryError;

        items.push(
          ...(diaryEntries || []).map((entry) => ({
            id: entry.id,
            content: entry.text,
            source: "diary" as const,
            tags: entry.tags,
            duration: entry.duration,
            createdAt: entry.created_at,
            metadata: { source: entry.source },
          }))
        );
      }

      // Sort combined results by date
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        items,
        nextPage: items.length === ITEMS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "ai" | "diary" }) => {
      if (source === "ai") {
        const { error } = await supabase.from("ai_memory").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("diary_entries").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({
        title: "Knowledge deleted",
        description: "The item has been removed from your knowledge base.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting knowledge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.source === "ai") {
        const { error } = await supabase
          .from("ai_memory")
          .update({
            content: data.content,
            memory_type: data.memoryType,
            confidence_score: data.confidenceScore,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("diary_entries")
          .update({
            text: data.content,
            tags: data.tags,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({
        title: "Knowledge updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating knowledge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) throw new Error("Not authenticated");

      if (data.source === "ai") {
        const { error } = await supabase.from("ai_memory").insert({
          user_id: session.session.user.id,
          content: data.content,
          memory_type: data.memoryType || "fact",
          confidence_score: data.confidenceScore || 0.8,
          is_active: true,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("diary_entries").insert({
          user_id: session.session.user.id,
          text: data.content,
          source: "manual",
          tags: data.tags || ["diary"],
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({
        title: "Knowledge created",
        description: "New item added to your knowledge base.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating knowledge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const knowledgeItems = data?.pages.flatMap((page) => page.items) || [];

  if (error) {
    toast({
      title: "Error loading knowledge base",
      description: error.message,
      variant: "destructive",
    });
  }

  return {
    knowledgeItems,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    deleteKnowledge: deleteMutation.mutate,
    updateKnowledge: updateMutation.mutate,
    createKnowledge: createMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateMutation.isPending,
    isCreating: createMutation.isPending,
  };
}
