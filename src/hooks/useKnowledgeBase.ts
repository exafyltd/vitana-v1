import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { notify, notifyError } from '@/lib/i18n-toast';

export interface KnowledgeItem {
  id: string;
  content: string;
  source: "ai" | "diary";
  memoryType?: string;
  tags?: string[];
  confidenceScore?: number;
  duration?: number;
  attachments?: string[];
  createdAt: string;
  metadata?: any;
}

const ITEMS_PER_PAGE = 20;

export function useKnowledgeBase(filter: "all" | "insights" | "diary" = "all") {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogger();

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
            tags: [mem.memory_type, "ai"].filter(Boolean) as string[],
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
            attachments: entry.attachments as string[],
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
        const { error } = await supabase
          .from("ai_memory")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("diary_entries").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["knowledge-base", filter] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["knowledge-base", filter]);

      // Optimistically update by removing the item
      queryClient.setQueryData(["knowledge-base", filter], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.filter((item: KnowledgeItem) => item.id !== variables.id),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: async (data, variables) => {
      // Refresh metadata calculation
      await supabase.functions.invoke('refresh-memory-metadata');
      
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["memory-metadata"] });
      notify('toasts.hooks.knowledgeDeleted', 'toasts.hooks.itemHasRemovedFromYourKnowledge');
      // Log activity
      logActivity({
        activityType: 'memory.delete',
        activityData: {
          source: variables.source,
          memory_id: variables.id
        },
        contextData: {
          knowledge_item_id: variables.id,
          source: variables.source
        }
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["knowledge-base", filter], context.previousData);
      }
      notifyError('toasts.hooks.errorDeletingKnowledge');
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
    onSuccess: async (data, variables) => {
      // Refresh metadata calculation
      await supabase.functions.invoke('refresh-memory-metadata');
      
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["memory-metadata"] });
      notify('toasts.hooks.knowledgeUpdated', 'toasts.hooks.yourChangesHaveSaved');
      // Log activity
      logActivity({
        activityType: 'memory.update',
        activityData: {
          content: (variables as any).content?.substring(0, 100),
          memory_type: (variables as any).memoryType,
          source: (variables as any).source
        },
        contextData: {
          knowledge_item_id: (variables as any).id,
          source: (variables as any).source
        }
      });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.errorUpdatingKnowledge');
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) throw new Error("Not authenticated");

      if (data.source === "ai") {
        const { data: created, error } = await supabase.from("ai_memory").insert({
          user_id: session.session.user.id,
          content: data.content,
          memory_type: data.memoryType || "fact",
          confidence_score: data.confidenceScore || 0.8,
          is_active: true,
          metadata: data.metadata || null,
        }).select('id').single();
        if (error) throw error;
        return created;
      } else {
        const { data: diaryEntry, error } = await supabase.from("diary_entries").insert({
          user_id: session.session.user.id,
          text: data.content,
          source: "manual",
          tags: data.tags || ["diary"],
        }).select().single();
        
        if (error) throw error;

        // Auto-extract insights from diary entry (non-blocking)
        if (diaryEntry?.id && data.content) {
          console.log('[diary-insights] Triggering auto-extraction for diary entry:', diaryEntry.id);
          supabase.functions.invoke('extract-diary-insights', {
            body: {
              diaryEntryId: diaryEntry.id,
              content: data.content
            }
          }).then((result) => {
            if (result.data?.success && result.data.insightsCount > 0) {
              console.log(`[diary-insights] ✓ Auto-extracted ${result.data.insightsCount} insights`);
              // Invalidate knowledge base to show new insights
              queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
            }
          }).catch((err) => {
            console.error('[diary-insights] Auto-extraction failed:', err);
          });
        }
        
        return diaryEntry;
      }
    },
    onSuccess: async (data, variables) => {
      // Refresh metadata calculation
      await supabase.functions.invoke('refresh-memory-metadata');
      
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["memory-metadata"] });
      notify('toasts.hooks.knowledgeCreated', 'toasts.hooks.newItemAddedYourKnowledgeBase');
      // Log activity
      logActivity({
        activityType: 'memory.create',
        activityData: {
          content: (variables as any).content?.substring(0, 100),
          memory_type: (variables as any).memoryType || 'general',
          source: (variables as any).source || 'manual',
          confidence_score: (variables as any).confidenceScore,
          has_tags: !!((variables as any).tags?.length)
        },
        contextData: {
          source: (variables as any).source
        }
      });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.errorCreatingKnowledge');
    },
  });

  const knowledgeItems = data?.pages.flatMap((page) => page.items) || [];

  if (error) {
    notifyError('toasts.hooks.errorLoadingKnowledgeBase');
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
