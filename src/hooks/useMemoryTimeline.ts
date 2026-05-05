import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

interface TimelineMemory {
  id: string;
  content: string;
  source: "ai" | "diary" | "conversation";
  memoryType?: string;
  sourceType?: string;
  tags?: string[];
  confidenceScore?: number;
  duration?: number;
  createdAt: string;
  metadata?: any;
  conversationId?: string;
  role?: "user" | "assistant";
}

const ITEMS_PER_PAGE = 20;

export function useMemoryTimeline(filter: "all" | "insights" | "conversations" = "all") {
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
    queryKey: ["memory-timeline", filter],
    queryFn: async ({ pageParam = 0 }) => {
      const combined: TimelineMemory[] = [];

      // Fetch AI memories and diary entries if insights are needed
      if (filter === "all" || filter === "insights") {
        const { data: aiMemories, error: aiError } = await supabase
          .from("ai_memory")
          .select("id, content, memory_type, confidence_score, metadata, created_at, updated_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

        if (aiError) throw aiError;

        const { data: diaryEntries, error: diaryError } = await supabase
          .from("diary_entries")
          .select("id, text, source, tags, duration, created_at, updated_at")
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

        if (diaryError) throw diaryError;

        combined.push(
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
        );
      }

      // Fetch conversation messages if needed
      if (filter === "all" || filter === "conversations") {
        const { data: conversations, error: convError } = await supabase
          .from("ai_messages")
          .select("id, conversation_id, role, content, created_at, metadata")
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

        if (convError) throw convError;

        combined.push(
          ...(conversations || []).map(c => ({
            id: c.id,
            content: c.content,
            source: "conversation" as const,
            conversationId: c.conversation_id,
            role: c.role as "user" | "assistant",
            createdAt: c.created_at,
            metadata: c.metadata
          }))
        );
      }

      // Sort by date
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    mutationFn: async ({ id, source }: { id: string; source: "ai" | "diary" | "conversation" }) => {
      if (source === "ai") {
        const { error } = await supabase.from("ai_memory").delete().eq("id", id);
        if (error) throw error;
      } else if (source === "diary") {
        const { error } = await supabase.from("diary_entries").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_messages").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-timeline"] });
      notify('toasts.hooks.memoryDeleted', 'toasts.hooks.memoryHasPermanentlyRemoved');
    },
    onError: (error) => {
      notifyError('toasts.hooks.deleteFailed');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, content, memoryType, confidenceScore, tags, source } = data;

      if (source === "ai") {
        const { error } = await supabase
          .from("ai_memory")
          .update({
            content,
            memory_type: memoryType,
            confidence_score: confidenceScore / 100,
            metadata: { tags },
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
      } else if (source === "diary") {
        const { error } = await supabase
          .from("diary_entries")
          .update({
            text: content,
            tags,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-timeline"] });
      notify('toasts.hooks.memoryUpdated', 'toasts.hooks.yourChangesHaveSaved');
    },
    onError: (error) => {
      notifyError('toasts.hooks.updateFailed');
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { content, memoryType, confidenceScore, tags, source } = data;

      if (source === "ai") {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        const { error } = await supabase.from("ai_memory").insert({
          user_id: user.id,
          content: content,
          memory_type: memoryType,
          confidence_score: confidenceScore / 100,
          is_active: true,
          metadata: { tags },
        });
        if (error) throw error;
      } else if (source === "diary") {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        const { error } = await supabase.from("diary_entries").insert({
          user_id: user.id,
          text: content,
          tags,
          source: "manual",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-timeline"] });
      notify('toasts.hooks.memoryCreated', 'toasts.hooks.yourNewMemoryHasAdded');
    },
    onError: (error) => {
      notifyError('toasts.hooks.createFailed');
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
    isDeleting: deleteMutation.isPending,
    updateMemory: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    createMemory: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
