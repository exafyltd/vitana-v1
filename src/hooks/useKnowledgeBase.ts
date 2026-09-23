import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { notify, notifyError } from '@/lib/i18n-toast';
import {
  fetchGardenEntries,
  addGardenNote,
  editGardenEntry,
  deleteGardenEntry,
  saveDiaryEntry,
  toApiCategory,
  toUiCategory,
  type GardenEntry,
} from '@/lib/memory-api';

/**
 * VTID-04389: the Memory Garden's items come from the canonical memory store
 * through the gateway (/api/v1/memory/garden) — the facts and episodes
 * Vitana actually recalls — instead of the legacy `ai_memory` /
 * `diary_entries` tables. The shape below is unchanged so the dialogs keep
 * working; `id` carries the entry kind (`fact:<id>` / `episode:<id>`).
 */
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

const TAG_NOISE = new Set(["diary", "ai", "voice", "photo", "text", "manual"]);

export function entryToKnowledgeItem(e: GardenEntry): KnowledgeItem {
  const isDiary = e.kind === "episode" && e.episode_kind === "diary";
  const category = toUiCategory(e.category);
  return {
    id: `${e.kind}:${e.id}`,
    content: e.content,
    source: isDiary ? "diary" : "ai",
    memoryType: category,
    tags: [category, isDiary ? "diary" : "ai"],
    confidenceScore: e.confidence ?? undefined,
    createdAt: e.occurred_at,
    metadata: { kind: e.kind, fact_key: e.fact_key, episode_kind: e.episode_kind, user_confirmed: e.user_confirmed },
  };
}

/** `fact:<id>` / `episode:<id>` → parts. A bare id is treated as an episode. */
export function parseKnowledgeId(id: string): { kind: "fact" | "episode"; id: string } {
  const m = /^(fact|episode):(.+)$/.exec(id);
  return m ? { kind: m[1] as "fact" | "episode", id: m[2] } : { kind: "episode", id };
}

/** The Garden category the user picked, from memoryType or the first meaningful tag. */
export function categoryFromItem(data: { memoryType?: string; tags?: string[] }) {
  const tag = (data.tags || []).find((t) => !TAG_NOISE.has(t));
  return toApiCategory(tag) ?? toApiCategory(data.memoryType);
}

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
    queryFn: async () => {
      const entries = await fetchGardenEntries({ limit: 500 });
      const items = entries
        .map(entryToKnowledgeItem)
        .filter((i) => filter === "all" || (filter === "diary" ? i.source === "diary" : i.source === "ai"));
      return { items, nextPage: undefined as number | undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string; source: "ai" | "diary" }) => {
      const ref = parseKnowledgeId(id);
      await deleteGardenEntry(ref.kind, ref.id);
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
      const ref = parseKnowledgeId(data.id);
      // A fact's category comes from its key; only episodes can be moved.
      const category = ref.kind === "episode" ? categoryFromItem(data) : undefined;
      await editGardenEntry(ref.kind, ref.id, data.content, category);
    },
    onSuccess: async (data, variables) => {
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
      if (data.source === "diary") {
        // VTID-04390: the one diary write path (diary row + memory episode +
        // Vitana Index). Photo/voice media from AddMemoryDialog is kept as an
        // attachment instead of being dropped.
        const mediaUrl = data.metadata?.mediaUrl as string | undefined;
        const saved = await saveDiaryEntry({
          text: data.content,
          source: "manual",
          tags: data.tags || ["diary"],
          attachments: mediaUrl ? [mediaUrl] : null,
        });
        return saved.entry;
      }
      // Anything else the user adds is a Garden note in the chosen category.
      const id = await addGardenNote(data.content, categoryFromItem(data) ?? "uncategorized");
      return { id };
    },
    onSuccess: async (data, variables) => {
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
